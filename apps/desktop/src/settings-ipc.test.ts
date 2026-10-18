import { describe, expect, it, vi } from "vitest";
import {
    registerSettingsIpc,
    SETTINGS_IPC_CHANNELS,
} from "./settings-ipc";
import type { DesktopLibraryContext } from "./desktop-library-context";

describe("registerSettingsIpc", () => {
    it("returns active library root from context", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        const context: DesktopLibraryContext = {
            resolved: { path: "/data/library", source: "user-data" },
            settings: {},
        };
        registerSettingsIpc(
            ipcMain as import("electron").IpcMain,
            () => context,
            {
                userDataPath: "/user",
                fs: {
                    readFile: async () => "{}",
                    writeFile: async () => {},
                    mkdir: async () => {},
                    rename: async () => {},
                    readdir: async () => [],
                    stat: async () => ({ isDirectory: () => true }),
                },
                showDirectoryPicker: async () => null,
            },
        );
        const getHandler = handlers.get(SETTINGS_IPC_CHANNELS.getLibraryRoot);
        await expect(getHandler!(null)).resolves.toEqual({
            path: "/data/library",
            source: "user-data",
        });
    });

    it("rejects choose when picker is cancelled", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        registerSettingsIpc(
            ipcMain as import("electron").IpcMain,
            () => ({
                resolved: { path: "/data/library", source: "user-data" },
                settings: {},
            }),
            {
                userDataPath: "/user",
                fs: {
                    readFile: async () => "{}",
                    writeFile: async () => {},
                    mkdir: async () => {},
                    rename: async () => {},
                    readdir: async () => [],
                    stat: async () => ({ isDirectory: () => true }),
                },
                showDirectoryPicker: async () => null,
            },
        );
        const chooseHandler = handlers.get(
            SETTINGS_IPC_CHANNELS.chooseLibraryRoot,
        );
        await expect(chooseHandler!(null)).rejects.toMatchObject({
            code: "LIBRARY_ROOT_CANCELLED",
        });
    });

    it("persists chosen folder and returns needsReload", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const writeFile = vi.fn(async () => {});
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        registerSettingsIpc(
            ipcMain as import("electron").IpcMain,
            () => ({
                resolved: { path: "/data/library", source: "user-data" },
                settings: {},
            }),
            {
                userDataPath: "/user",
                fs: {
                    readFile: async () => "{}",
                    writeFile,
                    mkdir: async () => {},
                    rename: async () => {},
                    readdir: async () => [],
                    stat: async () => ({ isDirectory: () => true }),
                },
                showDirectoryPicker: async () => "/Volumes/Books/Janus",
            },
        );
        const chooseHandler = handlers.get(
            SETTINGS_IPC_CHANNELS.chooseLibraryRoot,
        );
        await expect(chooseHandler!(null)).resolves.toEqual({
            path: "/Volumes/Books/Janus",
            needsReload: true,
        });
        expect(writeFile).toHaveBeenCalled();
    });

    it("reloads library context after choosing a new folder", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const reloadLibraryContext = vi.fn(async () => {});
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        registerSettingsIpc(
            ipcMain as import("electron").IpcMain,
            () => ({
                resolved: { path: "/data/library", source: "user-data" },
                settings: {},
            }),
            {
                userDataPath: "/user",
                fs: {
                    readFile: async () => "{}",
                    writeFile: async () => {},
                    mkdir: async () => {},
                    rename: vi.fn(async () => {}),
                    readdir: async (dir: string) =>
                        dir === "/data/library/books" ? ["book-id"] : [],
                    stat: async () => ({ isDirectory: () => true }),
                },
                showDirectoryPicker: async () => "/Volumes/Books/Janus",
                reloadLibraryContext,
            },
        );
        const chooseHandler = handlers.get(
            SETTINGS_IPC_CHANNELS.chooseLibraryRoot,
        );
        await chooseHandler!(null);
        expect(reloadLibraryContext).toHaveBeenCalledOnce();
    });

    it("moves library from current root before saving settings", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const rename = vi.fn(async () => {});
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        registerSettingsIpc(
            ipcMain as import("electron").IpcMain,
            () => ({
                resolved: { path: "/data/library", source: "user-data" },
                settings: {},
            }),
            {
                userDataPath: "/user",
                fs: {
                    readFile: async () => "{}",
                    writeFile: async () => {},
                    mkdir: async () => {},
                    rename,
                    readdir: async (dir: string) =>
                        dir === "/data/library/books" ? ["book-id"] : [],
                    stat: async () => ({ isDirectory: () => true }),
                },
                showDirectoryPicker: async () => "/Volumes/Books/Janus",
            },
        );
        const chooseHandler = handlers.get(
            SETTINGS_IPC_CHANNELS.chooseLibraryRoot,
        );
        await expect(chooseHandler!(null)).resolves.toEqual({
            path: "/Volumes/Books/Janus",
            needsReload: true,
        });
        expect(rename).toHaveBeenCalled();
    });

    it("does not move when chosen path matches current root", async () => {
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const rename = vi.fn(async () => {});
        const writeFile = vi.fn(async () => {});
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };
        registerSettingsIpc(
            ipcMain as import("electron").IpcMain,
            () => ({
                resolved: { path: "/data/library", source: "user-data" },
                settings: {},
            }),
            {
                userDataPath: "/user",
                fs: {
                    readFile: async () => "{}",
                    writeFile,
                    mkdir: async () => {},
                    rename,
                    readdir: async () => [],
                    stat: async () => ({ isDirectory: () => true }),
                },
                showDirectoryPicker: async () => "/data/library",
            },
        );
        const chooseHandler = handlers.get(
            SETTINGS_IPC_CHANNELS.chooseLibraryRoot,
        );
        await expect(chooseHandler!(null)).resolves.toEqual({
            path: "/data/library",
            needsReload: false,
        });
        expect(rename).not.toHaveBeenCalled();
        expect(writeFile).not.toHaveBeenCalled();
    });
});
