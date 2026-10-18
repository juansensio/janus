import { describe, expect, it, vi } from "vitest";
import { ipcMain } from "electron";
import { registerZoomIpc, ZOOM_IPC_CHANNELS } from "./zoom-ipc";

describe("zoom IPC", () => {
    it("persists editorZoomPercent without dropping uiLocale", async () => {
        const writes: string[] = [];
        const fs = {
            readFile: async () =>
                JSON.stringify({ uiLocale: "es", editorZoomPercent: 100 }),
            writeFile: async (_path: string, data: string) => {
                writes.push(data);
            },
            mkdir: async () => undefined,
        };
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const mockIpc = {
            handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
                handlers.set(channel, handler);
            },
        };
        registerZoomIpc(mockIpc as typeof ipcMain, {
            userDataPath: "/tmp/user",
            fs,
        });
        const setHandler = handlers.get(ZOOM_IPC_CHANNELS.setEditorZoom);
        expect(setHandler).toBeDefined();
        const result = await setHandler!({}, 125);
        expect(result).toMatchObject({ percent: 125 });
        expect(writes.length).toBe(1);
        const payload = JSON.parse(writes[0]) as {
            uiLocale?: string;
            editorZoomPercent?: number;
        };
        expect(payload.uiLocale).toBe("es");
        expect(payload.editorZoomPercent).toBe(125);
    });

    it("rejects invalid zoom percent", async () => {
        const fs = {
            readFile: async () => JSON.stringify({}),
            writeFile: async () => undefined,
            mkdir: async () => undefined,
        };
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const mockIpc = {
            handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
                handlers.set(channel, handler);
            },
        };
        registerZoomIpc(mockIpc as typeof ipcMain, {
            userDataPath: "/tmp/user",
            fs,
        });
        const setHandler = handlers.get(ZOOM_IPC_CHANNELS.setEditorZoom);
        await expect(setHandler!({}, 80)).rejects.toMatchObject({
            code: "INVALID_EDITOR_ZOOM",
        });
    });
});
