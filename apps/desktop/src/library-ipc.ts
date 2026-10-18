import type { IpcMain } from "electron";
import { createLibraryService, type LibraryFs } from "./library-service";
import { ShelfServiceError } from "@janus/library";
import { toBridgeRejectValue } from "./library-errors";
import {
    isLibraryIpcReject,
    toLibraryIpcReject,
    type LibraryIpcReject,
} from "./library-ipc-error";

export const LIBRARY_IPC_CHANNELS = {
    listBooks: "janus:library:listBooks",
    suggestNewBookTitle: "janus:library:suggestNewBookTitle",
    createBook: "janus:library:createBook",
    renameBook: "janus:library:renameBook",
    deleteBook: "janus:library:deleteBook",
} as const;

function rejectForBridge(error: unknown): LibraryIpcReject {
    if (isLibraryIpcReject(error)) {
        return error;
    }
    const mapped =
        error instanceof ShelfServiceError
            ? { message: error.message, code: error.code }
            : toBridgeRejectValue(error);
    return toLibraryIpcReject(mapped.message, mapped.code);
}

export function registerLibraryIpc(
    ipcMain: IpcMain,
    getLibraryRoot: () => string,
    fs: LibraryFs,
): void {
    ipcMain.handle(LIBRARY_IPC_CHANNELS.listBooks, async () => {
        try {
            return await createLibraryService(getLibraryRoot(), fs).listBooks();
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(LIBRARY_IPC_CHANNELS.suggestNewBookTitle, async () => {
        try {
            return await createLibraryService(
                getLibraryRoot(),
                fs,
            ).suggestNewBookTitle();
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(LIBRARY_IPC_CHANNELS.createBook, async (_event, title: unknown) => {
        if (typeof title !== "string") {
            throw rejectForBridge(
                new ShelfServiceError(
                    "INVALID_BOOK_TITLE",
                    "Book title is required",
                ),
            );
        }
        try {
            return await createLibraryService(getLibraryRoot(), fs).createBook(
                title,
            );
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(
        LIBRARY_IPC_CHANNELS.renameBook,
        async (_event, id: unknown, title: unknown) => {
            if (typeof id !== "string") {
                throw rejectForBridge(
                    new ShelfServiceError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            if (typeof title !== "string") {
                throw rejectForBridge(
                    new ShelfServiceError(
                        "INVALID_BOOK_TITLE",
                        "Book title is required",
                    ),
                );
            }
            try {
                return await createLibraryService(
                    getLibraryRoot(),
                    fs,
                ).renameBook(id, title);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        LIBRARY_IPC_CHANNELS.deleteBook,
        async (_event, id: unknown) => {
            if (typeof id !== "string") {
                throw rejectForBridge(
                    new ShelfServiceError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                await createLibraryService(getLibraryRoot(), fs).deleteBook(id);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );
}
