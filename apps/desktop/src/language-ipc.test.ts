import { describe, expect, it, vi } from "vitest";
import {
    LANGUAGE_IPC_CHANNELS,
    registerLanguageIpc,
} from "./language-ipc";

describe("registerLanguageIpc", () => {
    it("resolves UI language from settings and system locale", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        registerLanguageIpc(ipcMain as import("electron").IpcMain, {
            userDataPath: "/user",
            fs: {
                readFile: async () => JSON.stringify({ uiLocale: "es" }),
                writeFile: async () => {},
                mkdir: async () => {},
                rename: async () => {},
                readdir: async () => [],
                stat: async () => ({ isDirectory: () => true }),
            },
            getSystemLocale: () => "en-US",
        });
        const getHandler = handlers.get(LANGUAGE_IPC_CHANNELS.getUiLanguage);
        await expect(getHandler!(null)).resolves.toMatchObject({
            locale: "es",
            messages: expect.objectContaining({
                "library.shelfLabel": "Libros",
            }),
        });
    });

    it("persists uiLocale without dropping libraryRoot", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const writeFile = vi.fn(async () => {});
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        registerLanguageIpc(ipcMain as import("electron").IpcMain, {
            userDataPath: "/user",
            fs: {
                readFile: async () =>
                    JSON.stringify({ libraryRoot: "/books/custom" }),
                writeFile,
                mkdir: async () => {},
                rename: async () => {},
                readdir: async () => [],
                stat: async () => ({ isDirectory: () => true }),
            },
            getSystemLocale: () => "en",
        });
        const setHandler = handlers.get(LANGUAGE_IPC_CHANNELS.setUiLanguage);
        await expect(setHandler!(null, "es")).resolves.toMatchObject({
            locale: "es",
        });
        expect(writeFile).toHaveBeenCalled();
        const written = JSON.parse(
            String(writeFile.mock.calls[0]?.[1]),
        ) as { libraryRoot?: string; uiLocale?: string };
        expect(written.libraryRoot).toBe("/books/custom");
        expect(written.uiLocale).toBe("es");
    });

    it("rejects unsupported language codes", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        registerLanguageIpc(ipcMain as import("electron").IpcMain, {
            userDataPath: "/user",
            fs: {
                readFile: async () => "{}",
                writeFile: async () => {},
                mkdir: async () => {},
                rename: async () => {},
                readdir: async () => [],
                stat: async () => ({ isDirectory: () => true }),
            },
            getSystemLocale: () => "en",
        });
        const setHandler = handlers.get(LANGUAGE_IPC_CHANNELS.setUiLanguage);
        await expect(setHandler!(null, "fr")).rejects.toMatchObject({
            code: "UNSUPPORTED_LANGUAGE",
        });
    });
});
