import type { IpcMain } from "electron";
import { createLibraryService, type LibraryFs } from "./library-service";
import { ShelfServiceError } from "@janus/library";
import { toBridgeRejectValue } from "./library-errors";

export const LIBRARY_IPC_CHANNELS = {
    listBooks: "janus:library:listBooks",
    createBook: "janus:library:createBook",
    deleteBook: "janus:library:deleteBook",
} as const;

export function registerLibraryIpc(
    ipcMain: IpcMain,
    libraryRoot: string,
    fs: LibraryFs,
): void {
    const service = createLibraryService(libraryRoot, fs);

    ipcMain.handle(LIBRARY_IPC_CHANNELS.listBooks, async () => {
        try {
            return await service.listBooks();
        } catch (error) {
            throw Object.assign(new Error(toBridgeRejectValue(error).message), {
                code: toBridgeRejectValue(error).code,
            });
        }
    });

    ipcMain.handle(LIBRARY_IPC_CHANNELS.createBook, async () => {
        try {
            return await service.createBook();
        } catch (error) {
            throw Object.assign(new Error(toBridgeRejectValue(error).message), {
                code: toBridgeRejectValue(error).code,
            });
        }
    });

    ipcMain.handle(LIBRARY_IPC_CHANNELS.deleteBook, async (_event, id: string) => {
        try {
            await service.deleteBook(id);
        } catch (error) {
            if (error instanceof ShelfServiceError) {
                throw Object.assign(new Error(error.message), {
                    code: error.code,
                });
            }
            throw Object.assign(new Error(toBridgeRejectValue(error).message), {
                code: toBridgeRejectValue(error).code,
            });
        }
    });
}
