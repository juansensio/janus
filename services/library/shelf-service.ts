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
    stat(path: string): Promise<{ isDirectory(): boolean }>;
    realpath(path: string): Promise<string>;
    join(...parts: string[]): string;
};

export type ShelfServiceErrorCode =
    | "BOOK_NOT_FOUND"
    | "INVALID_BOOK_ID"
    | "INVALID_BOOK_TITLE"
    | "DUPLICATE_BOOK_TITLE";

export class ShelfServiceError extends Error {
    readonly code: ShelfServiceErrorCode;

    constructor(code: ShelfServiceErrorCode, message: string) {
        super(message);
        this.name = "ShelfServiceError";
        this.code = code;
    }
}

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

    function bookDir(id: string): string {
        if (!validateBookId(id)) {
            throw new ShelfServiceError("INVALID_BOOK_ID", "Invalid book id");
        }
        return fs.join(booksDir, id);
    }

    async function readSummaryForDir(
        entryName: string,
    ): Promise<BookSummary | null> {
        if (!validateBookId(entryName)) {
            return null;
        }
        const manifestPath = fs.join(booksDir, entryName, "book.json");
        try {
            const raw = await fs.readFile(manifestPath, "utf8");
            const manifest = parseManifest(raw, entryName);
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
                if (!validateBookId(name)) {
                    continue;
                }
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
            let title: string;
            try {
                title = normalizeBookTitle(titleRaw);
            } catch (error) {
                throw toShelfServiceError(error);
            }
            const existing = await this.listBooks();
            try {
                assertTitleNotDuplicate(title, existing);
            } catch (error) {
                throw toShelfServiceError(error);
            }
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
            const dir = bookDir(id);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(
                fs.join(dir, "book.json"),
                serializeManifest(manifest),
                "utf8",
            );
            return manifestToSummary(manifest);
        },

        async renameBook(id: string, titleRaw: string): Promise<BookSummary> {
            let title: string;
            try {
                title = normalizeBookTitle(titleRaw);
            } catch (error) {
                throw toShelfServiceError(error);
            }
            const dir = bookDir(id);
            const manifestPath = fs.join(dir, "book.json");
            let manifest;
            try {
                const raw = await fs.readFile(manifestPath, "utf8");
                manifest = parseManifest(raw, id);
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
            try {
                assertTitleNotDuplicate(title, existing, id);
            } catch (error) {
                throw toShelfServiceError(error);
            }
            const updated = {
                ...manifest,
                title,
            };
            await fs.writeFile(
                manifestPath,
                serializeManifest(updated),
                "utf8",
            );
            return manifestToSummary(updated);
        },

        async deleteBook(id: string): Promise<void> {
            const dir = bookDir(id);
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
