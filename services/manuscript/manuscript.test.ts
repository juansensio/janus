import { describe, expect, it } from "vitest";
import { createEmptyManuscriptHtml } from "./manuscript-html";
import {
    createManuscriptService,
    LEGACY_MANUSCRIPT_FILENAME,
    MANUSCRIPT_FILENAME,
    type ManuscriptFs,
} from "./manuscript-service";

function createMemoryFs(): ManuscriptFs & { files: Map<string, string> } {
    const files = new Map<string, string>();
    return {
        files,
        join: (...parts: string[]) => parts.join("/").replace(/\/+/g, "/"),
        async readFile(path: string) {
            const value = files.get(path);
            if (value === undefined) {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            }
            return value;
        },
        async writeFile(path: string, data: string) {
            files.set(path, data);
        },
        async rename(from: string, to: string) {
            const data = files.get(from);
            if (data === undefined) {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            }
            files.set(to, data);
            files.delete(from);
        },
    };
}

const emptyHtml = createEmptyManuscriptHtml();

describe("createManuscriptService", () => {
    it("reads missing manuscript as empty HTML without creating a file", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        await expect(service.read(bookDir)).resolves.toBe(emptyHtml);
        expect(fs.files.size).toBe(0);
    });

    it("creates manuscript.html on first write", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        const html =
            '<janus-manuscript version="1"><janus-p>Hello</janus-p></janus-manuscript>';
        await service.write(bookDir, html);
        const manuscriptPath = fs.join(bookDir, MANUSCRIPT_FILENAME);
        expect(fs.files.get(manuscriptPath)).toBe(html);
        await expect(service.read(bookDir)).resolves.toBe(html);
    });

    it("migrates legacy manuscript.md once and leaves the md file in place", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        const legacyPath = fs.join(bookDir, LEGACY_MANUSCRIPT_FILENAME);
        const htmlPath = fs.join(bookDir, MANUSCRIPT_FILENAME);
        fs.files.set(legacyPath, "Line one\n\nCafé ☕\n");

        const migrated = await service.read(bookDir);
        expect(migrated).toBe(
            '<janus-manuscript version="1"><janus-p>Line one</janus-p><janus-p>Café ☕\n</janus-p></janus-manuscript>',
        );
        expect(fs.files.get(htmlPath)).toBe(migrated);
        expect(fs.files.get(legacyPath)).toBe("Line one\n\nCafé ☕\n");

        fs.files.set(legacyPath, "changed after migration");
        await expect(service.read(bookDir)).resolves.toBe(migrated);
    });

    it("prefers manuscript.html when both html and md exist", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        const html =
            '<janus-manuscript version="1"><janus-p>from html</janus-p></janus-manuscript>';
        fs.files.set(fs.join(bookDir, MANUSCRIPT_FILENAME), html);
        fs.files.set(
            fs.join(bookDir, LEGACY_MANUSCRIPT_FILENAME),
            "from md",
        );
        await expect(service.read(bookDir)).resolves.toBe(html);
    });

    it("round-trips Unicode HTML", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        const html =
            '<janus-manuscript version="1"><janus-p>Café ☕</janus-p></janus-manuscript>';
        await service.write(bookDir, html);
        await expect(service.read(bookDir)).resolves.toBe(html);
    });

    it("replaces content on second write", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        const first =
            '<janus-manuscript version="1"><janus-p>first</janus-p></janus-manuscript>';
        const second =
            '<janus-manuscript version="1"><janus-p>second</janus-p></janus-manuscript>';
        await service.write(bookDir, first);
        await service.write(bookDir, second);
        await expect(service.read(bookDir)).resolves.toBe(second);
    });

    it("leaves no temp file after successful write", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        const html =
            '<janus-manuscript version="1"><janus-p>done</janus-p></janus-manuscript>';
        await service.write(bookDir, html);
        const manuscriptPath = fs.join(bookDir, MANUSCRIPT_FILENAME);
        const tempPaths = [...fs.files.keys()].filter(
            (p) => p !== manuscriptPath,
        );
        expect(tempPaths).toEqual([]);
    });

    it("does not require or modify book.json", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        const manifestPath = fs.join(bookDir, "book.json");
        fs.files.set(manifestPath, '{"version":1}');
        const html =
            '<janus-manuscript version="1"><janus-p>chapter</janus-p></janus-manuscript>';
        await service.write(bookDir, html);
        expect(fs.files.get(manifestPath)).toBe('{"version":1}');
    });
});
