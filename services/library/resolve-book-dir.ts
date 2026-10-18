import { isSkippableListError } from "./list-errors";
import { parseManifest } from "./book-manifest";
import { validateBookId } from "./validate-book-id";
import { ShelfServiceError } from "./shelf-errors";

export type ResolveBookDirFs = {
    join(...parts: string[]): string;
    readdir(
        path: string,
        options?: { withFileTypes?: boolean },
    ): Promise<
        string[] | { name: string; isDirectory(): boolean }[]
    >;
    readFile(path: string, encoding: "utf8"): Promise<string>;
    stat(path: string): Promise<{ isDirectory(): boolean }>;
};

export async function resolveBookDirById(
    booksDir: string,
    bookId: string,
    fs: ResolveBookDirFs,
): Promise<string> {
    if (!validateBookId(bookId)) {
        throw new ShelfServiceError("INVALID_BOOK_ID", "Invalid book id");
    }

    const legacyDir = fs.join(booksDir, bookId);
    try {
        const raw = await fs.readFile(fs.join(legacyDir, "book.json"), "utf8");
        const manifest = parseManifest(raw, bookId);
        if (manifest.id === bookId) {
            return legacyDir;
        }
    } catch (error) {
        if (!isSkippableListError(error)) {
            throw error;
        }
    }

    let entries: string[] | { name: string; isDirectory(): boolean }[];
    try {
        entries = await fs.readdir(booksDir, { withFileTypes: true });
    } catch {
        throw new ShelfServiceError("BOOK_NOT_FOUND", "Book not found");
    }

    for (const entry of entries) {
        const name = typeof entry === "string" ? entry : entry.name;
        const isDir =
            typeof entry === "string"
                ? (await fs.stat(fs.join(booksDir, name))).isDirectory()
                : entry.isDirectory();
        if (!isDir) {
            continue;
        }
        const manifestPath = fs.join(booksDir, name, "book.json");
        try {
            const raw = await fs.readFile(manifestPath, "utf8");
            const dirHint = validateBookId(name) ? name : undefined;
            const manifest = parseManifest(raw, dirHint);
            if (manifest.id === bookId) {
                return fs.join(booksDir, name);
            }
        } catch (error) {
            if (isSkippableListError(error)) {
                continue;
            }
            throw error;
        }
    }

    throw new ShelfServiceError("BOOK_NOT_FOUND", "Book not found");
}
