import type { IpcMain } from "electron";
import { buildUiLanguage, buildUiLanguageForCode } from "@janus/bridge";
import { assertSupported } from "@janus/languages";
import {
    isLibraryIpcReject,
    toLibraryIpcReject,
    type LibraryIpcReject,
} from "./library-ipc-error";
import {
    loadJanusSettings,
    saveJanusSettings,
    type LibraryRootFs,
} from "./library-root";

export const LANGUAGE_IPC_CHANNELS = {
    getUiLanguage: "janus:language:getUiLanguage",
    setUiLanguage: "janus:language:setUiLanguage",
} as const;

function rejectForBridge(error: unknown): LibraryIpcReject {
    if (isLibraryIpcReject(error)) {
        return error;
    }
    const code =
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
            ? (error as { code: string }).code
            : "UNSUPPORTED_LANGUAGE";
    const message =
        error instanceof Error ? error.message : "Language error";
    return toLibraryIpcReject(message, code);
}

export function registerLanguageIpc(
    ipcMain: IpcMain,
    options: {
        userDataPath: string;
        fs: LibraryRootFs;
        getSystemLocale: () => string;
    },
): void {
    ipcMain.handle(LANGUAGE_IPC_CHANNELS.getUiLanguage, async () => {
        try {
            const settings = await loadJanusSettings(
                options.userDataPath,
                options.fs,
            );
            return buildUiLanguage(settings.uiLocale, options.getSystemLocale());
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(
        LANGUAGE_IPC_CHANNELS.setUiLanguage,
        async (_event, code: unknown) => {
            try {
                if (typeof code !== "string") {
                    throw Object.assign(new Error("Unsupported language"), {
                        code: "UNSUPPORTED_LANGUAGE",
                    });
                }
                assertSupported(code);
                const settings = await loadJanusSettings(
                    options.userDataPath,
                    options.fs,
                );
                await saveJanusSettings(
                    options.userDataPath,
                    { ...settings, uiLocale: code },
                    options.fs,
                );
                return buildUiLanguageForCode(code);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );
}
