import type { IpcMain } from "electron";
import { createLibraryService, type LibraryFs } from "./library-service";
import { ShelfServiceError } from "@janus/library";
import { toBridgeRejectValue } from "./library-errors";

export const LIBRARY_IPC_CHANNELS = {
    listBooks: "janus:library:listBooks",
    createBook: "janus:library:createBook",
    deleteBook: "janus:library:deleteBook",
} as const;

function rejectForBridge(error: unknown): Error {
    const mapped =
        error instanceof ShelfServiceError
            ? { message: error.message, code: error.code }
            : toBridgeRejectValue(error);
    return Object.assign(new Error(mapped.message), { code: mapped.code });
}

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
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(LIBRARY_IPC_CHANNELS.createBook, async () => {
        try {
            return await service.createBook();
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(
        LIBRARY_IPC_CHANNELS.deleteBook,
        async (_event, id: unknown) => {
            if (typeof id !== "string") {
                throw rejectForBridge(
                    new ShelfServiceError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                await service.deleteBook(id);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );
}
