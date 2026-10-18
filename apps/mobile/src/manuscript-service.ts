import {
    createManuscriptService,
    type ManuscriptFs,
} from "@janus/manuscript";
import { libraryBooksDir, resolveBookDirById } from "@janus/library";

export type ManuscriptBridgeFs = ManuscriptFs & {
    readFile(path: string, encoding: "utf8"): Promise<string>;
};

export function createManuscriptBridgeService(
    libraryRoot: string,
    fs: ManuscriptBridgeFs,
) {
    const manuscript = createManuscriptService(fs);
    const booksDir = libraryBooksDir(libraryRoot);

    async function resolveBookDir(id: string): Promise<string> {
        return resolveBookDirById(booksDir, id, fs);
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
