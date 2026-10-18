import { describe, expect, it } from "vitest";
import { serializeManifest } from "@janus/library";
import { createManuscriptBridgeService } from "./manuscript-service";

describe("createManuscriptBridgeService path containment", () => {
    it("rejects read when realpath escapes the books root", async () => {
        const id = "550e8400-e29b-41d4-a716-446655440000";
        const bookDir = "/lib/books/Draft";
        const fs = {
            join: (...parts: string[]) => parts.join("/"),
            async mkdir() {},
            async readdir(path: string, options?: { withFileTypes?: boolean }) {
                if (path === "/lib/books") {
                    const name = "Draft";
                    if (options?.withFileTypes) {
                        return [{ name, isDirectory: () => true }];
                    }
                    return [name];
                }
                return [];
            },
            async readFile(path: string) {
                if (path === `/lib/books/${id}/book.json`) {
                    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
                }
                if (path.endsWith("book.json")) {
                    return serializeManifest({
                        version: 1,
                        id,
                        title: "Draft",
                        createdAt: "2026-10-18T10:00:00.000Z",
                    });
                }
                if (path.endsWith("manuscript.md")) {
                    return "";
                }
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            },
            async writeFile() {},
            async stat(path: string) {
                if (path === bookDir) {
                    return { isDirectory: () => true };
                }
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            },
            async realpath(path: string) {
                if (path === bookDir) {
                    return "/outside/library";
                }
                return path;
            },
        };

        const manuscript = createManuscriptBridgeService("/lib", fs);
        await expect(manuscript.readManuscript(id)).rejects.toMatchObject({
            code: "BOOK_NOT_FOUND",
        });
    });
});
