import { describe, expect, it } from "vitest";
import { serializeManifest } from "./book-manifest";
import { resolveBookDirById, type ResolveBookDirFs } from "./resolve-book-dir";
import { ShelfServiceError } from "./shelf-errors";

function createMemoryFs(): ResolveBookDirFs & {
    files: Map<string, string>;
    dirs: Set<string>;
} {
    const files = new Map<string, string>();
    const dirs = new Set<string>();

    const fs: ResolveBookDirFs & {
        files: Map<string, string>;
        dirs: Set<string>;
    } = {
        files,
        dirs,
        join: (...parts: string[]) => parts.join("/").replace(/\/+/g, "/"),
        async readdir(path: string, options?: { withFileTypes?: boolean }) {
            const prefix = path.endsWith("/") ? path : `${path}/`;
            const names = new Set<string>();
            for (const dir of dirs) {
                if (dir.startsWith(prefix) && dir !== path) {
                    const rest = dir.slice(prefix.length);
                    if (!rest.includes("/")) {
                        names.add(rest);
                    }
                }
            }
            const list = [...names];
            if (options?.withFileTypes) {
                return list.map((name) => ({
                    name,
                    isDirectory: () => dirs.has(`${prefix}${name}`),
                }));
            }
            return list;
        },
        async readFile(path: string) {
            const value = files.get(path);
            if (value === undefined) {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            }
            return value;
        },
        async stat(path: string) {
            if (!dirs.has(path)) {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            }
            return { isDirectory: () => dirs.has(path) };
        },
    };
    return fs;
}

describe("resolveBookDirById", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const booksDir = "/lib/books";

    it("throws INVALID_BOOK_ID for malformed id", async () => {
        const fs = createMemoryFs();
        await expect(
            resolveBookDirById(booksDir, "not-a-uuid", fs),
        ).rejects.toMatchObject({ code: "INVALID_BOOK_ID" });
    });

    it("resolves legacy uuid directory when manifest id matches", async () => {
        const fs = createMemoryFs();
        const legacyDir = `${booksDir}/${id}`;
        fs.dirs.add(legacyDir);
        fs.files.set(
            `${legacyDir}/book.json`,
            serializeManifest({
                version: 1,
                id,
                title: "Legacy",
                createdAt: "2026-10-18T10:00:00.000Z",
            }),
        );

        const dir = await resolveBookDirById(booksDir, id, fs);
        expect(dir).toBe(legacyDir);
    });

    it("resolves title-named directory by manifest id", async () => {
        const fs = createMemoryFs();
        const titleDir = `${booksDir}/My Novel`;
        fs.dirs.add(titleDir);
        fs.files.set(
            `${titleDir}/book.json`,
            serializeManifest({
                version: 1,
                id,
                title: "My Novel",
                createdAt: "2026-10-18T10:00:00.000Z",
            }),
        );

        const dir = await resolveBookDirById(booksDir, id, fs);
        expect(dir).toBe(titleDir);
    });

    it("throws BOOK_NOT_FOUND when no directory matches", async () => {
        const fs = createMemoryFs();
        fs.dirs.add(booksDir);
        await expect(resolveBookDirById(booksDir, id, fs)).rejects.toBeInstanceOf(
            ShelfServiceError,
        );
        await expect(resolveBookDirById(booksDir, id, fs)).rejects.toMatchObject({
            code: "BOOK_NOT_FOUND",
        });
    });
});
