import {
    createSupportDocService,
    SupportDocServiceError,
    type SupportDocFs,
} from "@janus/support-docs";
import { libraryBooksDir, resolveBookDirById } from "@janus/library";

export type SupportDocsBridgeFs = SupportDocFs;

export function createSupportDocsBridgeService(
    libraryRoot: string,
    fs: SupportDocsBridgeFs,
) {
    const service = createSupportDocService(fs);
    const booksDir = libraryBooksDir(libraryRoot);

    async function resolveBookDir(id: string): Promise<string> {
        return resolveBookDirById(booksDir, id, fs);
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
                const bookDir = await resolveBookDir(id);
                return service.listSupportDocsForBook(bookDir);
            } catch (error) {
                mapSupportDocError(error);
            }
        },

        async createSupportDoc(id: string, kind: string) {
            try {
                const bookDir = await resolveBookDir(id);
                return await service.createSupportDoc(bookDir, kind);
            } catch (error) {
                mapSupportDocError(error);
            }
        },

        async readSupportDoc(id: string, kind: string) {
            try {
                const bookDir = await resolveBookDir(id);
                return await service.readSupportDocEditorHtml(bookDir, kind);
            } catch (error) {
                mapSupportDocError(error);
            }
        },

        async writeSupportDoc(id: string, kind: string, editorHtml: string) {
            try {
                const bookDir = await resolveBookDir(id);
                await service.writeSupportDocFromEditorHtml(
                    bookDir,
                    kind,
                    editorHtml,
                );
            } catch (error) {
                mapSupportDocError(error);
            }
        },
    };
}
