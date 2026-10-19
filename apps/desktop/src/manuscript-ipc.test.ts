import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createLibraryService, type LibraryFs } from "./library-service";
import { createManuscriptBridgeService } from "./manuscript-service";
import {
    MANUSCRIPT_IPC_CHANNELS,
    registerManuscriptIpc,
} from "./manuscript-ipc";
import {
    createEmptyManuscriptHtml,
    LEGACY_MANUSCRIPT_FILENAME,
    MANUSCRIPT_FILENAME,
} from "@janus/manuscript";

function nodeFs(): LibraryFs & {
    rename(from: string, to: string): Promise<void>;
} {
    return {
        mkdir: (p, options) => fs.mkdir(p, options),
        readdir: (p, options) =>
            fs.readdir(p, options as { withFileTypes?: boolean }),
        readFile: (p, encoding) => fs.readFile(p, encoding),
        writeFile: (p, data, encoding) => fs.writeFile(p, data, encoding),
        rm: (p, options) => fs.rm(p, options),
        stat: (p) => fs.stat(p),
        realpath: (p) => fs.realpath(p),
        rename: (from, to) => fs.rename(from, to),
    };
}

describe("createManuscriptBridgeService", () => {
    it("reads and writes manuscript.html for an existing book", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-ms-"));
        const library = createLibraryService(
            root,
            nodeFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );
        const created = await library.createBook("Draft");
        const manuscript = createManuscriptBridgeService(root, nodeFs());
        const emptyHtml = createEmptyManuscriptHtml();
        const html =
            '<janus-manuscript version="1"><janus-p>Hello</janus-p><janus-p>Café</janus-p></janus-manuscript>';

        await expect(manuscript.readManuscript(created.id)).resolves.toBe(
            emptyHtml,
        );
        await manuscript.writeManuscript(created.id, html);
        await expect(manuscript.readManuscript(created.id)).resolves.toBe(html);

        const filePath = path.join(
            root,
            "books",
            "Draft",
            MANUSCRIPT_FILENAME,
        );
        await expect(fs.readFile(filePath, "utf8")).resolves.toBe(html);

        await fs.rm(root, { recursive: true });
    });

    it("migrates legacy manuscript.md on first read", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-ms-"));
        const library = createLibraryService(
            root,
            nodeFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );
        const created = await library.createBook("Legacy");
        const bookDir = path.join(root, "books", "Legacy");
        await fs.writeFile(
            path.join(bookDir, LEGACY_MANUSCRIPT_FILENAME),
            "One\n\nTwo",
            "utf8",
        );

        const manuscript = createManuscriptBridgeService(root, nodeFs());
        const migrated = await manuscript.readManuscript(created.id);
        expect(migrated).toBe(
            '<janus-manuscript version="1"><janus-p>One</janus-p><janus-p>Two</janus-p></janus-manuscript>',
        );
        await expect(
            fs.readFile(path.join(bookDir, MANUSCRIPT_FILENAME), "utf8"),
        ).resolves.toBe(migrated);
        await expect(
            fs.readFile(path.join(bookDir, LEGACY_MANUSCRIPT_FILENAME), "utf8"),
        ).resolves.toBe("One\n\nTwo");

        await fs.rm(root, { recursive: true });
    });

    it("acceptAiDraft persists transformed html", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-ms-"));
        const library = createLibraryService(
            root,
            nodeFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );
        const created = await library.createBook("Draft");
        const manuscript = createManuscriptBridgeService(root, nodeFs());
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment><janus-ai-draft id="d1" comment-id="c1"><janus-p>Done</janus-p></janus-ai-draft></janus-manuscript>';
        await manuscript.writeManuscript(created.id, html);
        const next = await manuscript.acceptAiDraft(created.id, "d1");
        expect(next).toBe(
            '<janus-manuscript version="1"><janus-p>Done</janus-p></janus-manuscript>',
        );
        await expect(manuscript.readManuscript(created.id)).resolves.toBe(next);
        await fs.rm(root, { recursive: true });
    });

    it("beginHighlightRewrite persists rewrite comment", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-ms-"));
        const library = createLibraryService(
            root,
            nodeFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );
        const created = await library.createBook("Draft");
        const manuscript = createManuscriptBridgeService(root, nodeFs());
        const html =
            '<janus-manuscript version="1"><janus-p>Hello world</janus-p></janus-manuscript>';
        await manuscript.writeManuscript(created.id, html);
        const next = await manuscript.beginHighlightRewrite(created.id, {
            commentId: "c1",
            instruction: "Rewrite",
            spans: [{ blockIndex: 0, start: 6, end: 11 }],
        });
        expect(next).toContain('variant="rewrite"');
        expect(next).toContain('source="world"');
        await expect(manuscript.readManuscript(created.id)).resolves.toBe(next);
        await fs.rm(root, { recursive: true });
    });

    it("rejects invalid and missing book ids", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-ms-"));
        const manuscript = createManuscriptBridgeService(root, nodeFs());

        await expect(manuscript.readManuscript("../escape")).rejects.toMatchObject(
            { code: "INVALID_BOOK_ID" },
        );
        await expect(
            manuscript.readManuscript("550e8400-e29b-41d4-a716-446655440000"),
        ).rejects.toMatchObject({ code: "BOOK_NOT_FOUND" });

        await fs.rm(root, { recursive: true });
    });
});

describe("registerManuscriptIpc", () => {
    it("maps INVALID_BOOK_ID when read id is not a string", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-ms-"));
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const ipcMain = {
            handle(channel: string, fn: (...args: unknown[]) => unknown) {
                handlers.set(channel, fn);
            },
        };

        registerManuscriptIpc(
            ipcMain as import("electron").IpcMain,
            () => root,
            nodeFs(),
        );

        const readHandler = handlers.get(MANUSCRIPT_IPC_CHANNELS.readManuscript);
        expect(readHandler).toBeDefined();
        await expect(readHandler!(null, undefined)).rejects.toMatchObject({
            code: "INVALID_BOOK_ID",
        });

        await fs.rm(root, { recursive: true });
    });
});
