import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createLibraryService, type LibraryFs } from "./library-service";
import {
    LIBRARY_IPC_CHANNELS,
    registerLibraryIpc,
} from "./library-ipc";
function nodeLibraryFs(): LibraryFs {
    return {
        mkdir: (p, options) => fs.mkdir(p, options),
        readdir: (p, options) =>
            fs.readdir(p, options as { withFileTypes?: boolean }),
        readFile: (p, encoding) => fs.readFile(p, encoding),
        writeFile: (p, data, encoding) => fs.writeFile(p, data, encoding),
        rm: (p, options) => fs.rm(p, options),
        stat: (p) => fs.stat(p),
        realpath: (p) => fs.realpath(p),
    };
}

describe("createLibraryService", () => {
    it("creates, lists, and deletes a book on disk", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-lib-"));
        const service = createLibraryService(
            root,
            nodeLibraryFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );

        const created = await service.createBook("Untitled");
        expect(created).toEqual({
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Untitled",
            createdAt: created.createdAt,
        });

        const manifestPath = path.join(
            root,
            "books",
            created.id,
            "book.json",
        );
        const manifestRaw = await fs.readFile(manifestPath, "utf8");
        expect(manifestRaw).toContain('"title": "Untitled"');

        const listed = await service.listBooks();
        expect(listed).toHaveLength(1);
        expect(listed[0]?.id).toBe(created.id);

        await service.deleteBook(created.id);
        await expect(service.listBooks()).resolves.toEqual([]);
        await expect(service.deleteBook(created.id)).rejects.toMatchObject({
            code: "BOOK_NOT_FOUND",
        });

        await fs.rm(root, { recursive: true });
    });

    it("skips corrupt manifests when listing", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-lib-"));
        const booksDir = path.join(root, "books");
        const goodId = "550e8400-e29b-41d4-a716-446655440000";
        const badId = "660e8400-e29b-41d4-a716-446655440001";
        await fs.mkdir(path.join(booksDir, goodId), { recursive: true });
        await fs.mkdir(path.join(booksDir, badId), { recursive: true });
        await fs.writeFile(
            path.join(booksDir, goodId, "book.json"),
            JSON.stringify({
                version: 1,
                id: goodId,
                title: "Good",
                createdAt: "2026-01-01T00:00:00.000Z",
            }),
            "utf8",
        );
        await fs.writeFile(
            path.join(booksDir, badId, "book.json"),
            "{ not-json",
            "utf8",
        );

        const service = createLibraryService(root, nodeLibraryFs());
        const listed = await service.listBooks();
        expect(listed).toHaveLength(1);
        expect(listed[0]?.title).toBe("Good");

        await fs.rm(root, { recursive: true });
    });

    it("rejects invalid book ids on delete", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-lib-"));
        const service = createLibraryService(root, nodeLibraryFs());
        await expect(service.deleteBook("../escape")).rejects.toMatchObject({
            code: "INVALID_BOOK_ID",
        });
        await fs.rm(root, { recursive: true });
    });

    it("skips book directories without book.json when listing", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-lib-"));
        const booksDir = path.join(root, "books");
        const emptyId = "770e8400-e29b-41d4-a716-446655440002";
        const goodId = "550e8400-e29b-41d4-a716-446655440000";
        await fs.mkdir(path.join(booksDir, emptyId), { recursive: true });
        await fs.mkdir(path.join(booksDir, goodId), { recursive: true });
        await fs.writeFile(
            path.join(booksDir, goodId, "book.json"),
            JSON.stringify({
                version: 1,
                id: goodId,
                title: "Good",
                createdAt: "2026-01-01T00:00:00.000Z",
            }),
            "utf8",
        );

        const service = createLibraryService(root, nodeLibraryFs());
        const listed = await service.listBooks();
        expect(listed).toHaveLength(1);
        expect(listed[0]?.title).toBe("Good");

        await fs.rm(root, { recursive: true });
    });

    it("creates books with explicit titles and suggestNewBookTitle", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-lib-"));
        const service = createLibraryService(
            root,
            nodeLibraryFs(),
            (() => {
                let n = 0;
                return () =>
                    n++ === 0
                        ? "550e8400-e29b-41d4-a716-446655440000"
                        : "660e8400-e29b-41d4-a716-446655440001";
            })(),
        );

        await expect(service.suggestNewBookTitle()).resolves.toBe("Untitled");
        const first = await service.createBook("Untitled");
        await expect(service.suggestNewBookTitle()).resolves.toBe("Untitled 2");
        const second = await service.createBook("Untitled 2");
        expect(first.title).toBe("Untitled");
        expect(second.title).toBe("Untitled 2");

        const renamed = await service.renameBook(first.id, "Renamed");
        expect(renamed.title).toBe("Renamed");

        await fs.rm(root, { recursive: true });
    });

    it("refuses delete when book dir resolves outside books root", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-lib-"));
        const outside = path.join(root, "outside");
        const id = "550e8400-e29b-41d4-a716-446655440000";
        await fs.mkdir(outside, { recursive: true });
        await fs.mkdir(path.join(root, "books"), { recursive: true });
        await fs.symlink(outside, path.join(root, "books", id));

        const service = createLibraryService(root, nodeLibraryFs());
        await expect(service.deleteBook(id)).rejects.toMatchObject({
            code: "BOOK_NOT_FOUND",
        });
        await expect(fs.stat(outside)).resolves.toBeDefined();

        await fs.rm(root, { recursive: true });
    });
});

describe("registerLibraryIpc", () => {
    it("maps INVALID_BOOK_ID when delete id is not a string", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-lib-"));
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };

        registerLibraryIpc(
            ipcMain as import("electron").IpcMain,
            root,
            nodeLibraryFs(),
        );

        const deleteHandler = handlers.get(LIBRARY_IPC_CHANNELS.deleteBook);
        expect(deleteHandler).toBeDefined();
        await expect(deleteHandler!(null, undefined)).rejects.toMatchObject({
            code: "INVALID_BOOK_ID",
        });

        await fs.rm(root, { recursive: true });
    });
});
