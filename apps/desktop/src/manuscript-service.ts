import path from "node:path";
import {
    createManuscriptService,
    type ManuscriptFs,
} from "@janus/manuscript";
import { libraryBooksDir, resolveBookDirById } from "@janus/library";
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
        try {
            return await resolveBookDirById(booksDir, id, manuscriptFs);
        } catch (error) {
            if (
                error !== null &&
                typeof error === "object" &&
                "code" in error
            ) {
                const code = String((error as { code: unknown }).code);
                if (code === "INVALID_BOOK_ID") {
                    throw new LibraryBridgeError(
                        "INVALID_BOOK_ID",
                        "Invalid book id",
                    );
                }
                if (code === "BOOK_NOT_FOUND") {
                    throw new LibraryBridgeError(
                        "BOOK_NOT_FOUND",
                        "Book not found",
                    );
                }
            }
            throw error;
        }
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
