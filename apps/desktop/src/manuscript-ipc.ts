import type { IpcMain } from "electron";
import { ManuscriptServiceError } from "@janus/manuscript";
import { LibraryBridgeError, toBridgeRejectValue } from "./library-errors";
import {
    isLibraryIpcReject,
    toLibraryIpcReject,
    type LibraryIpcReject,
} from "./library-ipc-error";
import {
    createManuscriptBridgeService,
    type ManuscriptBridgeFs,
} from "./manuscript-service";

export const MANUSCRIPT_IPC_CHANNELS = {
    readManuscript: "janus:manuscript:readManuscript",
    writeManuscript: "janus:manuscript:writeManuscript",
    acceptAiDraft: "janus:manuscript:acceptAiDraft",
    rejectAiDraft: "janus:manuscript:rejectAiDraft",
    insertOrReplaceDraft: "janus:manuscript:insertOrReplaceDraft",
    beginHighlightRewrite: "janus:manuscript:beginHighlightRewrite",
} as const;

function rejectForBridge(error: unknown): LibraryIpcReject {
    if (isLibraryIpcReject(error)) {
        return error;
    }
    const mapped =
        error instanceof ManuscriptServiceError
            ? { message: error.message, code: error.code }
            : toBridgeRejectValue(error);
    return toLibraryIpcReject(mapped.message, mapped.code);
}

export function registerManuscriptIpc(
    ipcMain: IpcMain,
    getLibraryRoot: () => string,
    fs: ManuscriptBridgeFs,
): void {
    ipcMain.handle(
        MANUSCRIPT_IPC_CHANNELS.readManuscript,
        async (_event, id: unknown) => {
            if (typeof id !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                return await createManuscriptBridgeService(
                    getLibraryRoot(),
                    fs,
                ).readManuscript(id);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        MANUSCRIPT_IPC_CHANNELS.writeManuscript,
        async (_event, id: unknown, text: unknown) => {
            if (typeof id !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            if (typeof text !== "string") {
                throw rejectForBridge(
                    Object.assign(new Error("Manuscript text is required"), {
                        code: "MANUSCRIPT_WRITE_FAILED",
                    }),
                );
            }
            try {
                await createManuscriptBridgeService(
                    getLibraryRoot(),
                    fs,
                ).writeManuscript(id, text);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        MANUSCRIPT_IPC_CHANNELS.acceptAiDraft,
        async (_event, id: unknown, draftId: unknown) => {
            if (typeof id !== "string" || typeof draftId !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                return await createManuscriptBridgeService(
                    getLibraryRoot(),
                    fs,
                ).acceptAiDraft(id, draftId);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        MANUSCRIPT_IPC_CHANNELS.rejectAiDraft,
        async (_event, id: unknown, draftId: unknown) => {
            if (typeof id !== "string" || typeof draftId !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                return await createManuscriptBridgeService(
                    getLibraryRoot(),
                    fs,
                ).rejectAiDraft(id, draftId);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        MANUSCRIPT_IPC_CHANNELS.insertOrReplaceDraft,
        async (
            _event,
            id: unknown,
            commentId: unknown,
            draftHtml: unknown,
            draftId: unknown,
        ) => {
            if (
                typeof id !== "string" ||
                typeof commentId !== "string" ||
                typeof draftHtml !== "string" ||
                typeof draftId !== "string"
            ) {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            try {
                return await createManuscriptBridgeService(
                    getLibraryRoot(),
                    fs,
                ).insertOrReplaceDraft(id, commentId, draftHtml, draftId);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        MANUSCRIPT_IPC_CHANNELS.beginHighlightRewrite,
        async (_event, id: unknown, input: unknown) => {
            if (typeof id !== "string" || input === null || typeof input !== "object") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            const payload = input as {
                commentId?: unknown;
                instruction?: unknown;
                spans?: unknown;
            };
            if (
                typeof payload.commentId !== "string" ||
                typeof payload.instruction !== "string" ||
                !Array.isArray(payload.spans)
            ) {
                throw rejectForBridge(
                    new LibraryBridgeError("MANUSCRIPT_INVALID", "Invalid rewrite input"),
                );
            }
            try {
                return await createManuscriptBridgeService(
                    getLibraryRoot(),
                    fs,
                ).beginHighlightRewrite(id, {
                    commentId: payload.commentId,
                    instruction: payload.instruction,
                    spans: payload.spans as import("@janus/manuscript").HighlightRewriteSpan[],
                });
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );
}
