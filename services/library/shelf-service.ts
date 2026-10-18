import {
    manifestToSummary,
    parseManifest,
    serializeManifest,
    type BookSummary,
} from "./book-manifest";
import {
    assertTitleNotDuplicate,
    DuplicateBookTitleError,
    InvalidBookTitleError,
    normalizeBookTitle,
} from "./book-title";
import { allocateUntitledTitle } from "./titles";
import { validateBookId } from "./validate-book-id";
import { isResolvedPathInsideRoot } from "./path-containment";
import { libraryBooksDir, sortBooksForShelf } from "./shelf-utils";
import { isSkippableListError } from "./list-errors";
import { allocateBookDirectoryName } from "./book-directory-name";
import { migrateLegacyUuidBookDirectories } from "./migrate-legacy-uuid-dirs";
import { resolveBookDirById } from "./resolve-book-dir";
import { ShelfServiceError } from "./shelf-errors";

export type ShelfFsDirent = {
    name: string;
    isDirectory(): boolean;
};

export type ShelfFs = {
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    readdir(
        path: string,
        options?: { withFileTypes?: boolean },
    ): Promise<string[] | ShelfFsDirent[]>;
    readFile(path: string, encoding: "utf8"): Promise<string>;
    writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
    rm(path: string, options?: { recursive?: boolean }): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    stat(path: string): Promise<{ isDirectory(): boolean }>;
    realpath(path: string): Promise<string>;
    join(...parts: string[]): string;
};

export { ShelfServiceError, type ShelfServiceErrorCode } from "./shelf-errors";

function toShelfServiceError(error: unknown): ShelfServiceError {
    if (error instanceof InvalidBookTitleError) {
        return new ShelfServiceError("INVALID_BOOK_TITLE", error.message);
    }
    if (error instanceof DuplicateBookTitleError) {
        return new ShelfServiceError("DUPLICATE_BOOK_TITLE", error.message);
    }
    if (error instanceof ShelfServiceError) {
        return error;
    }
    throw error;
}

function normalizeTitleForService(titleRaw: string): string {
    try {
        return normalizeBookTitle(titleRaw);
    } catch (error) {
        throw toShelfServiceError(error);
    }
}

function basenameFromPath(dirPath: string): string {
    const trimmed = dirPath.replace(/\/+$/, "");
    const idx = trimmed.lastIndexOf("/");
    return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

function ensureTitleUnique(
    title: string,
    books: BookSummary[],
    excludeId?: string,
): void {
    try {
        assertTitleNotDuplicate(title, books, excludeId);
    } catch (error) {
        throw toShelfServiceError(error);
    }
}

export type ShelfService = {
    listBooks(): Promise<BookSummary[]>;
    suggestNewBookTitle(): Promise<string>;
    createBook(title: string): Promise<BookSummary>;
    renameBook(id: string, title: string): Promise<BookSummary>;
    deleteBook(id: string): Promise<void>;
};

export function createShelfService(
    libraryRoot: string,
    fs: ShelfFs,
    createId: () => string = () => crypto.randomUUID(),
): ShelfService {
    const booksDir = libraryBooksDir(libraryRoot);

    async function ensureBooksDir(): Promise<void> {
        await fs.mkdir(booksDir, { recursive: true });
    }

    async function collectTakenBookDirectoryNames(): Promise<Set<string>> {
        const taken = new Set<string>();
        let entries: string[] | ShelfFsDirent[];
        try {
            entries = await fs.readdir(booksDir, { withFileTypes: true });
        } catch {
            return taken;
        }
        for (const entry of entries) {
            const name = typeof entry === "string" ? entry : entry.name;
            const isDir =
                typeof entry === "string"
                    ? (await fs.stat(fs.join(booksDir, name))).isDirectory()
                    : entry.isDirectory();
            if (isDir) {
                taken.add(name);
            }
        }
        return taken;
    }

    async function readSummaryForDir(
        entryName: string,
    ): Promise<BookSummary | null> {
        const manifestPath = fs.join(booksDir, entryName, "book.json");
        try {
            const raw = await fs.readFile(manifestPath, "utf8");
            const dirHint = validateBookId(entryName) ? entryName : undefined;
            const manifest = parseManifest(raw, dirHint);
            return manifestToSummary(manifest);
        } catch (error) {
            if (isSkippableListError(error)) {
                return null;
            }
            throw error;
        }
    }

    return {
        async listBooks(): Promise<BookSummary[]> {
            await ensureBooksDir();
            await migrateLegacyUuidBookDirectories(booksDir, fs);
            let entries: string[] | ShelfFsDirent[];
            try {
                entries = await fs.readdir(booksDir, { withFileTypes: true });
            } catch {
                return [];
            }

            const summaries: BookSummary[] = [];
            for (const entry of entries) {
                const name =
                    typeof entry === "string" ? entry : entry.name;
                const isDir =
                    typeof entry === "string"
                        ? (await fs.stat(fs.join(booksDir, name))).isDirectory()
                        : entry.isDirectory();
                if (!isDir) {
                    continue;
                }
                const summary = await readSummaryForDir(name);
                if (summary) {
                    summaries.push(summary);
                }
            }
            return sortBooksForShelf(summaries);
        },

        async suggestNewBookTitle(): Promise<string> {
            const existing = await this.listBooks();
            return allocateUntitledTitle(existing.map((book) => book.title));
        },

        async createBook(titleRaw: string): Promise<BookSummary> {
            await ensureBooksDir();
            const title = normalizeTitleForService(titleRaw);
            const existing = await this.listBooks();
            ensureTitleUnique(title, existing);
            const id = createId().toLowerCase();
            if (!validateBookId(id)) {
                throw new Error("Generated book id is invalid");
            }
            const createdAt = new Date().toISOString();
            const manifest = {
                version: 1 as const,
                id,
                title,
                createdAt,
            };
            const taken = await collectTakenBookDirectoryNames();
            const dirName = allocateBookDirectoryName(title, taken);
            const dir = fs.join(booksDir, dirName);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(
                fs.join(dir, "book.json"),
                serializeManifest(manifest),
                "utf8",
            );
            return manifestToSummary(manifest);
        },

        async renameBook(id: string, titleRaw: string): Promise<BookSummary> {
            const title = normalizeTitleForService(titleRaw);
            const dir = await resolveBookDirById(booksDir, id, fs);
            const manifestPath = fs.join(dir, "book.json");
            let manifest;
            try {
                const raw = await fs.readFile(manifestPath, "utf8");
                const dirName = basenameFromPath(dir);
                const dirHint = validateBookId(dirName) ? dirName : undefined;
                manifest = parseManifest(raw, dirHint);
            } catch (error) {
                if (isSkippableListError(error)) {
                    throw new ShelfServiceError(
                        "BOOK_NOT_FOUND",
                        "Book not found",
                    );
                }
                throw error;
            }
            const existing = await this.listBooks();
            ensureTitleUnique(title, existing, id);
            const updated = {
                ...manifest,
                title,
            };
            await fs.writeFile(
                manifestPath,
                serializeManifest(updated),
                "utf8",
            );
            const currentDirName = basenameFromPath(dir);
            const taken = await collectTakenBookDirectoryNames();
            taken.delete(currentDirName);
            const targetDirName = allocateBookDirectoryName(title, taken);
            if (targetDirName !== currentDirName) {
                const targetDir = fs.join(booksDir, targetDirName);
                if (targetDir !== dir) {
                    await fs.rename(dir, targetDir);
                }
            }
            return manifestToSummary(updated);
        },

        async deleteBook(id: string): Promise<void> {
            const dir = await resolveBookDirById(booksDir, id, fs);
            try {
                const info = await fs.stat(dir);
                if (!info.isDirectory()) {
                    throw new ShelfServiceError(
                        "BOOK_NOT_FOUND",
                        "Book not found",
                    );
                }
            } catch (error) {
                if (error instanceof ShelfServiceError) {
                    throw error;
                }
                throw new ShelfServiceError(
                    "BOOK_NOT_FOUND",
                    "Book not found",
                );
            }
            const [resolvedDir, resolvedBooksDir] = await Promise.all([
                fs.realpath(dir),
                fs.realpath(booksDir),
            ]);
            if (!isResolvedPathInsideRoot(resolvedDir, resolvedBooksDir)) {
                throw new ShelfServiceError(
                    "BOOK_NOT_FOUND",
                    "Book not found",
                );
            }
            await fs.rm(dir, { recursive: true });
        },
    };
}
