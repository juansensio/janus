import path from "node:path";
import {
    createSupportDocService,
    SupportDocServiceError,
    type SupportDocFs,
} from "@janus/support-docs";
import {
    isResolvedPathInsideRoot,
    libraryBooksDir,
    resolveBookDirById,
} from "@janus/library";
import { LibraryBridgeError } from "./library-errors";

export type SupportDocsBridgeFs = SupportDocFs & {
    realpath(path: string): Promise<string>;
};

export function createSupportDocsBridgeService(
    libraryRoot: string,
    fs: Omit<SupportDocsBridgeFs, "join"> & { join?: SupportDocFs["join"] },
) {
    const supportFs: SupportDocsBridgeFs = {
        ...fs,
        join: fs.join ?? ((...parts: string[]) => path.join(...parts)),
    };
    const service = createSupportDocService(supportFs);
    const booksDir = libraryBooksDir(libraryRoot);

    async function resolveContainedBookDir(id: string): Promise<string> {
        const bookDir = await resolveBookDir(id);
        const [resolvedDir, resolvedBooksDir] = await Promise.all([
            supportFs.realpath(bookDir),
            supportFs.realpath(booksDir),
        ]);
        if (!isResolvedPathInsideRoot(resolvedDir, resolvedBooksDir)) {
            throw new LibraryBridgeError("BOOK_NOT_FOUND", "Book not found");
        }
        return bookDir;
    }

    async function resolveBookDir(id: string): Promise<string> {
        try {
            return await resolveBookDirById(booksDir, id, supportFs);
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

    function mapSupportDocError(error: unknown): never {
        if (error instanceof SupportDocServiceError) {
            throw Object.assign(new Error(error.message), {
                code: error.code,
            });
        }
        throw error;
    }

    return {
        async listSupportDocs(id: string) {
            try {
                const bookDir = await resolveContainedBookDir(id);
                return service.listSupportDocsForBook(bookDir);
            } catch (error) {
                if (error instanceof LibraryBridgeError) {
                    throw error;
                }
                mapSupportDocError(error);
            }
        },

        async createSupportDoc(id: string, kind: string) {
            try {
                const bookDir = await resolveContainedBookDir(id);
                return await service.createSupportDoc(bookDir, kind);
            } catch (error) {
                if (error instanceof LibraryBridgeError) {
                    throw error;
                }
                mapSupportDocError(error);
            }
        },

        async readSupportDoc(id: string, kind: string) {
            try {
                const bookDir = await resolveContainedBookDir(id);
                return await service.readSupportDocEditorHtml(bookDir, kind);
            } catch (error) {
                if (error instanceof LibraryBridgeError) {
                    throw error;
                }
                mapSupportDocError(error);
            }
        },

        async writeSupportDoc(id: string, kind: string, editorHtml: string) {
            try {
                const bookDir = await resolveContainedBookDir(id);
                await service.writeSupportDocFromEditorHtml(
                    bookDir,
                    kind,
                    editorHtml,
                );
            } catch (error) {
                if (error instanceof LibraryBridgeError) {
                    throw error;
                }
                mapSupportDocError(error);
            }
        },
    };
}
