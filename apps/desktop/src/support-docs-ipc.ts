import type { IpcMain } from "electron";
import { SupportDocServiceError } from "@janus/support-docs";
import { LibraryBridgeError, toBridgeRejectValue } from "./library-errors";
import {
    isLibraryIpcReject,
    toLibraryIpcReject,
    type LibraryIpcReject,
} from "./library-ipc-error";
import {
    createSupportDocsBridgeService,
    type SupportDocsBridgeFs,
} from "./support-docs-service";

export const SUPPORT_DOCS_IPC_CHANNELS = {
    listSupportDocs: "janus:support-docs:listSupportDocs",
    createSupportDoc: "janus:support-docs:createSupportDoc",
    readSupportDoc: "janus:support-docs:readSupportDoc",
    writeSupportDoc: "janus:support-docs:writeSupportDoc",
} as const;

function rejectForBridge(error: unknown): LibraryIpcReject {
    if (isLibraryIpcReject(error)) {
        return error;
    }
    const mapped =
        error instanceof SupportDocServiceError
            ? { message: error.message, code: error.code }
            : error instanceof LibraryBridgeError
              ? { message: error.message, code: error.code }
              : toBridgeRejectValue(error);
    return toLibraryIpcReject(mapped.message, mapped.code);
}

export function registerSupportDocsIpc(
    ipcMain: IpcMain,
    getLibraryRoot: () => string,
    fs: SupportDocsBridgeFs,
): void {
    const serviceFactory = () =>
        createSupportDocsBridgeService(getLibraryRoot(), fs);

    ipcMain.handle(
        SUPPORT_DOCS_IPC_CHANNELS.listSupportDocs,
        async (_event, id: unknown) => {
            if (typeof id !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                return await serviceFactory().listSupportDocs(id);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        SUPPORT_DOCS_IPC_CHANNELS.createSupportDoc,
        async (_event, id: unknown, kind: unknown) => {
            if (typeof id !== "string" || typeof kind !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                return await serviceFactory().createSupportDoc(id, kind);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        SUPPORT_DOCS_IPC_CHANNELS.readSupportDoc,
        async (_event, id: unknown, kind: unknown) => {
            if (typeof id !== "string" || typeof kind !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                return await serviceFactory().readSupportDoc(id, kind);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        SUPPORT_DOCS_IPC_CHANNELS.writeSupportDoc,
        async (_event, id: unknown, kind: unknown, editorHtml: unknown) => {
            if (typeof id !== "string" || typeof kind !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            if (typeof editorHtml !== "string") {
                throw rejectForBridge(
                    Object.assign(new Error("Editor content is required"), {
                        code: "SUPPORT_DOC_WRITE_FAILED",
                    }),
                );
            }
            try {
                await serviceFactory().writeSupportDoc(id, kind, editorHtml);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );
}
