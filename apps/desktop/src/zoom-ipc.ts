import type { IpcMain } from "electron";
import { buildEditorZoomResult } from "@janus/bridge";
import { assertEditorZoomPercent } from "@janus/zoom";
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

export const ZOOM_IPC_CHANNELS = {
    getEditorZoom: "janus:zoom:getEditorZoom",
    setEditorZoom: "janus:zoom:setEditorZoom",
    menuAction: "janus:zoom:menuAction",
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
            : "MANUSCRIPT_WRITE_FAILED";
    const message =
        error instanceof Error ? error.message : "Editor zoom error";
    return toLibraryIpcReject(message, code);
}

export function registerZoomIpc(
    ipcMain: IpcMain,
    options: {
        userDataPath: string;
        fs: LibraryRootFs;
    },
): void {
    ipcMain.handle(ZOOM_IPC_CHANNELS.getEditorZoom, async () => {
        try {
            const settings = await loadJanusSettings(
                options.userDataPath,
                options.fs,
            );
            return buildEditorZoomResult(settings.editorZoomPercent);
        } catch (error) {
            throw rejectForBridge(error);
        }
    });

    ipcMain.handle(
        ZOOM_IPC_CHANNELS.setEditorZoom,
        async (_event, percent: unknown) => {
            try {
                const valid = assertEditorZoomPercent(percent);
                const settings = await loadJanusSettings(
                    options.userDataPath,
                    options.fs,
                );
                await saveJanusSettings(
                    options.userDataPath,
                    { ...settings, editorZoomPercent: valid },
                    options.fs,
                );
                return buildEditorZoomResult(valid);
            } catch (error) {
                throw rejectForBridge(error);
            }
        },
    );
}
