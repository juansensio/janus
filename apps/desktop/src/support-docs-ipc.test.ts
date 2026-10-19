import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createEmptyManuscriptHtml } from "@janus/manuscript";
import { plainTextToEditorHtml } from "@janus/support-docs";
import { createLibraryService, type LibraryFs } from "./library-service";
import { createSupportDocsBridgeService } from "./support-docs-service";

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

describe("createSupportDocsBridgeService", () => {
    it("lists, creates, and round-trips worldbuilding on disk", async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-sd-"));
        const library = createLibraryService(
            root,
            nodeFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );
        const created = await library.createBook("Notes");
        const support = createSupportDocsBridgeService(root, nodeFs());

        await expect(support.listSupportDocs(created.id)).resolves.toEqual([
            { kind: "worldbuilding", exists: false },
        ]);

        await expect(
            support.createSupportDoc(created.id, "worldbuilding"),
        ).resolves.toEqual({ kind: "worldbuilding", exists: true });

        const emptyHtml = createEmptyManuscriptHtml();
        await expect(
            support.readSupportDoc(created.id, "worldbuilding"),
        ).resolves.toBe(emptyHtml);

        const html = plainTextToEditorHtml("Realm lore");
        await support.writeSupportDoc(created.id, "worldbuilding", html);
        await expect(
            support.readSupportDoc(created.id, "worldbuilding"),
        ).resolves.toBe(html);

        const filePath = path.join(
            root,
            "books",
            "Notes",
            "support",
            "worldbuilding.md",
        );
        await expect(fs.readFile(filePath, "utf8")).resolves.toBe("Realm lore");

        await fs.rm(root, { recursive: true });
    });
});
