import path from "node:path";
import {
    createManuscriptService,
    type ManuscriptFs,
} from "@janus/manuscript";
import {
    isSkippableListError,
    libraryBooksDir,
    validateBookId,
} from "@janus/library";
import { LibraryBridgeError } from "./library-errors";

export type ManuscriptBridgeFs = ManuscriptFs & {
    readFile(path: string, encoding: "utf8"): Promise<string>;
};

export function createManuscriptBridgeService(
    libraryRoot: string,
    fs: Omit<ManuscriptBridgeFs, "join"> & { join?: ManuscriptFs["join"] },
) {
    const manuscriptFs: ManuscriptFs = {
        ...fs,
        join: fs.join ?? ((...parts: string[]) => path.join(...parts)),
    };
    const manuscript = createManuscriptService(manuscriptFs);
    const booksDir = libraryBooksDir(libraryRoot);

    async function resolveBookDir(id: string): Promise<string> {
        if (!validateBookId(id)) {
            throw new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id");
        }
        const dir = manuscriptFs.join(booksDir, id);
        const manifestPath = manuscriptFs.join(dir, "book.json");
        try {
            await fs.readFile(manifestPath, "utf8");
        } catch (error) {
            if (isSkippableListError(error)) {
                throw new LibraryBridgeError(
                    "BOOK_NOT_FOUND",
                    "Book not found",
                );
            }
            throw error;
        }
        return dir;
    }

    return {
        async readManuscript(id: string): Promise<string> {
            const bookDir = await resolveBookDir(id);
            return manuscript.read(bookDir);
        },

        async writeManuscript(id: string, text: string): Promise<void> {
            const bookDir = await resolveBookDir(id);
            await manuscript.write(bookDir, text);
        },
    };
}
