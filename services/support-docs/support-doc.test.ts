import { describe, expect, it } from "vitest";
import { createEmptyManuscriptHtml } from "@janus/manuscript";
import {
    editorHtmlToPlainText,
    isEditorHtmlSupportDocSafe,
    plainTextToEditorHtml,
} from "./editor-binding";
import { createSupportDocService } from "./support-doc-service";

function createMemoryFs(): {
    fs: import("./support-doc-service").SupportDocFs;
    files: Map<string, string>;
} {
    const files = new Map<string, string>();
    const fs = {
        join: (...parts: string[]) => parts.join("/"),
        async mkdir() {},
        async stat(path: string) {
            if (!files.has(path)) {
                const error = new Error("ENOENT") as NodeJS.ErrnoException;
                error.code = "ENOENT";
                throw error;
            }
            return { isFile: () => true };
        },
        async readFile(path: string) {
            if (!files.has(path)) {
                const error = new Error("ENOENT") as NodeJS.ErrnoException;
                error.code = "ENOENT";
                throw error;
            }
            return files.get(path) ?? "";
        },
        async writeFile(path: string, data: string) {
            files.set(path, data);
        },
        async rename(from: string, to: string) {
            const data = files.get(from);
            if (data === undefined) {
                throw new Error("missing temp");
            }
            files.delete(from);
            files.set(to, data);
        },
    };
    return { fs, files };
}

describe("support doc editor binding", () => {
    it("round-trips plain paragraphs through editor HTML", () => {
        const plain = "Realm\n\nCafé ☕";
        const html = plainTextToEditorHtml(plain);
        expect(editorHtmlToPlainText(html)).toBe(plain);
    });

    it("maps empty plain text to empty manuscript HTML", () => {
        expect(plainTextToEditorHtml("")).toBe(createEmptyManuscriptHtml());
    });

    it("rejects AI blocks in support HTML", () => {
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="a">x</janus-ai-comment></janus-manuscript>';
        expect(isEditorHtmlSupportDocSafe(html)).toBe(false);
    });
});

describe("support doc service", () => {
    it("lists worldbuilding as missing until create", async () => {
        const { fs } = createMemoryFs();
        const service = createSupportDocService(fs);
        const list = await service.listSupportDocsForBook("/book");
        expect(list).toEqual([{ kind: "worldbuilding", exists: false }]);
    });

    it("creates and reads worldbuilding plain text via editor HTML", async () => {
        const { fs, files } = createMemoryFs();
        const service = createSupportDocService(fs);
        await service.createSupportDoc("/book", "worldbuilding");
        expect(files.get("/book/support/worldbuilding.md")).toBe("");

        const html = plainTextToEditorHtml("Notes line");
        await service.writeSupportDocFromEditorHtml(
            "/book",
            "worldbuilding",
            html,
        );
        expect(files.get("/book/support/worldbuilding.md")).toBe("Notes line");

        const readBack = await service.readSupportDocEditorHtml(
            "/book",
            "worldbuilding",
        );
        expect(editorHtmlToPlainText(readBack)).toBe("Notes line");
    });

    it("rejects duplicate create", async () => {
        const { fs } = createMemoryFs();
        const service = createSupportDocService(fs);
        await service.createSupportDoc("/book", "worldbuilding");
        await expect(
            service.createSupportDoc("/book", "worldbuilding"),
        ).rejects.toMatchObject({ code: "SUPPORT_DOC_ALREADY_EXISTS" });
    });

    it("rejects invalid kind", async () => {
        const { fs } = createMemoryFs();
        const service = createSupportDocService(fs);
        await expect(
            service.createSupportDoc("/book", "outline"),
        ).rejects.toMatchObject({ code: "INVALID_SUPPORT_DOC_KIND" });
    });
});
