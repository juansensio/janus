import { describe, expect, it } from "vitest";
import {
    createManuscriptService,
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

describe("createManuscriptService", () => {
    it("reads missing manuscript as empty string", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        await expect(service.read(bookDir)).resolves.toBe("");
        expect(fs.files.size).toBe(0);
    });

    it("round-trips Unicode and blank lines", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        const text = "Line one\n\nCafé ☕\n";
        await service.write(bookDir, text);
        await expect(service.read(bookDir)).resolves.toBe(text);
    });

    it("replaces content on second write", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        await service.write(bookDir, "first");
        await service.write(bookDir, "second");
        await expect(service.read(bookDir)).resolves.toBe("second");
    });

    it("leaves no temp file after successful write", async () => {
        const fs = createMemoryFs();
        const service = createManuscriptService(fs);
        const bookDir = "/lib/books/550e8400-e29b-41d4-a716-446655440000";
        await service.write(bookDir, "done");
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
        await service.write(bookDir, "chapter");
        expect(fs.files.get(manifestPath)).toBe('{"version":1}');
    });
});
