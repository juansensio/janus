import type { Dialog, IpcMain } from "electron";
import { LibraryBridgeError, toBridgeRejectValue } from "./library-errors";
import {
    isLibraryIpcReject,
    toLibraryIpcReject,
    type LibraryIpcReject,
} from "./library-ipc-error";
import type { DesktopLibraryContext } from "./desktop-library-context";
import {
    loadJanusSettings,
    saveJanusSettings,
    validateLibraryRootWritable,
    type LibraryRootFs,
} from "./library-root";

export const SETTINGS_IPC_CHANNELS = {
    getLibraryRoot: "janus:settings:getLibraryRoot",
    chooseLibraryRoot: "janus:settings:chooseLibraryRoot",
} as const;

function rejectForBridge(error: unknown): LibraryIpcReject {
    if (isLibraryIpcReject(error)) {
        return error;
    }
    const mapped =
        error instanceof LibraryBridgeError
            ? { message: error.message, code: error.code }
            : toBridgeRejectValue(error);
    return toLibraryIpcReject(mapped.message, mapped.code);
}

export function registerSettingsIpc(
    ipcMain: IpcMain,
    getContext: () => DesktopLibraryContext,
    options: {
        userDataPath: string;
        fs: LibraryRootFs;
        showDirectoryPicker: () => Promise<string | null>;
    },
): void {
    ipcMain.handle(SETTINGS_IPC_CHANNELS.getLibraryRoot, async () => {
        try {
            return getContext().resolved;
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(SETTINGS_IPC_CHANNELS.chooseLibraryRoot, async () => {
        try {
            const chosen = await options.showDirectoryPicker();
            if (!chosen) {
                throw new LibraryBridgeError(
                    "LIBRARY_ROOT_CANCELLED",
                    "Folder selection cancelled",
                );
            }
            await validateLibraryRootWritable(chosen, options.fs);
            const settings = await loadJanusSettings(
                options.userDataPath,
                options.fs,
            );
            await saveJanusSettings(
                options.userDataPath,
                { ...settings, libraryRoot: chosen },
                options.fs,
            );
            return { path: chosen, needsReload: true as const };
        } catch (error) {
            throw rejectForBridge(error);
        }
    });
}

export function createElectronDirectoryPicker(
    dialog: Dialog,
): () => Promise<string | null> {
    return async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openDirectory", "createDirectory"],
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0] ?? null;
    };
}
