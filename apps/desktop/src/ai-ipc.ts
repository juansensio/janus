import type { IpcMain } from "electron";
import { AiAssistError } from "@janus/ai-assist";
import { LibraryBridgeError, toBridgeRejectValue } from "./library-errors";
import {
    isLibraryIpcReject,
    toLibraryIpcReject,
    type LibraryIpcReject,
} from "./library-ipc-error";
import { createAiBridgeService } from "./ai-service";
import {
    AI_IPC_CHANNELS,
    type AiWriteDraftDeltaPayload,
} from "./ai-ipc-channels";
import type { ManuscriptBridgeFs } from "./manuscript-service";

export { AI_IPC_CHANNELS, type AiWriteDraftDeltaPayload } from "./ai-ipc-channels";

function rejectForBridge(error: unknown): LibraryIpcReject {
    if (isLibraryIpcReject(error)) {
        return error;
    }
    if (error instanceof AiAssistError) {
        return toLibraryIpcReject(error.message, error.code);
    }
    const mapped = toBridgeRejectValue(error);
    return toLibraryIpcReject(mapped.message, mapped.code);
}

export function registerAiIpc(
    ipcMain: IpcMain,
    getLibraryRoot: () => string,
    fs: ManuscriptBridgeFs,
    options: {
        userDataPath: string;
        settingsFs: Pick<
            import("./library-root").LibraryRootFs,
            "readFile" | "writeFile" | "mkdir"
        >;
    },
): void {
    const service = () =>
        createAiBridgeService(getLibraryRoot(), fs, {
            userDataPath: options.userDataPath,
            settingsFs: options.settingsFs,
        });

    ipcMain.handle(AI_IPC_CHANNELS.getAiProviderStatus, async () => {
        try {
            return await service().getAiProviderStatus();
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(AI_IPC_CHANNELS.connectOpenAiCodex, async () => {
        try {
            await service().connectOpenAiCodex();
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(AI_IPC_CHANNELS.disconnectOpenAiCodex, async () => {
        try {
            await service().disconnectOpenAiCodex();
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(AI_IPC_CHANNELS.getOpenAiModelSettings, async () => {
        try {
            return await service().getOpenAiModelSettings();
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(
        AI_IPC_CHANNELS.setOpenAiModelPreference,
        async (_event, preference: unknown) => {
            if (typeof preference !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError(
                        "AI_PROVIDER_ERROR",
                        "Model preference is required",
                    ),
                );
            }
            try {
                return await service().setOpenAiModelPreference(preference);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );

    ipcMain.handle(
        AI_IPC_CHANNELS.writeForComment,
        async (
            event,
            bookId: unknown,
            commentId: unknown,
            locale: unknown,
            requestId: unknown,
        ) => {
            if (typeof bookId !== "string" || typeof commentId !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            if (typeof locale !== "string") {
                throw rejectForBridge(
                    Object.assign(new Error("Locale is required"), {
                        code: "UNSUPPORTED_LANGUAGE",
                    }),
                );
            }
            const onDraftDelta =
                typeof requestId === "string"
                    ? (draftHtml: string) => {
                          event.sender.send(AI_IPC_CHANNELS.writeDraftDelta, {
                              requestId,
                              draftHtml,
                          } satisfies AiWriteDraftDeltaPayload);
                      }
                    : undefined;
            try {
                return await service().writeForComment(
                    bookId,
                    commentId,
                    locale,
                    { onDraftDelta },
                );
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );
}
