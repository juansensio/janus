import {
    createManuscriptService,
    type ManuscriptFs,
} from "@janus/manuscript";
import {
    isSkippableListError,
    libraryBooksDir,
    ShelfServiceError,
    validateBookId,
} from "@janus/library";

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
        if (!validateBookId(id)) {
            throw new ShelfServiceError("INVALID_BOOK_ID", "Invalid book id");
        }
        const dir = fs.join(booksDir, id);
        const manifestPath = fs.join(dir, "book.json");
        try {
            await fs.readFile(manifestPath, "utf8");
        } catch (error) {
            if (isSkippableListError(error)) {
                throw new ShelfServiceError(
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
