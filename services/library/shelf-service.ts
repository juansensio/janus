import {
    manifestToSummary,
    parseManifest,
    serializeManifest,
    type BookSummary,
} from "./book-manifest";
import { allocateUntitledTitle } from "./titles";
import { validateBookId } from "./validate-book-id";
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
    join(...parts: string[]): string;
};

export type ShelfServiceErrorCode = "BOOK_NOT_FOUND" | "INVALID_BOOK_ID";

export class ShelfServiceError extends Error {
    readonly code: ShelfServiceErrorCode;

    constructor(code: ShelfServiceErrorCode, message: string) {
        super(message);
        this.name = "ShelfServiceError";
        this.code = code;
    }
}

export type ShelfService = {
    listBooks(): Promise<BookSummary[]>;
    createBook(): Promise<BookSummary>;
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
                const isDir =
                    typeof entry === "string"
                        ? (await fs.stat(fs.join(booksDir, entry))).isDirectory()
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

        async createBook(): Promise<BookSummary> {
            await ensureBooksDir();
            const existing = await this.listBooks();
            const title = allocateUntitledTitle(
                existing.map((book) => book.title),
            );
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
            await fs.rm(dir, { recursive: true });
        },
    };
}
