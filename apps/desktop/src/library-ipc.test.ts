import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createLibraryService, type LibraryFs } from "./library-service";
import { ShelfServiceError } from "@janus/library";

function nodeLibraryFs(): LibraryFs {
    return {
        mkdir: (p, options) => fs.mkdir(p, options),
        readdir: (p, options) =>
            fs.readdir(p, options as { withFileTypes?: boolean }),
        readFile: (p, encoding) => fs.readFile(p, encoding),
        writeFile: (p, data, encoding) => fs.writeFile(p, data, encoding),
        rm: (p, options) => fs.rm(p, options),
        stat: (p) => fs.stat(p),
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

        const created = await service.createBook();
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
        await expect(service.deleteBook("../escape")).rejects.toBeInstanceOf(
            ShelfServiceError,
        );
        await fs.rm(root, { recursive: true });
    });
});
