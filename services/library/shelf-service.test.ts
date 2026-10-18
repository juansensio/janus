import { describe, expect, it } from "vitest";
import { createShelfService, type ShelfFs } from "./shelf-service";

function createMemoryFs(): ShelfFs & {
    files: Map<string, string>;
    dirs: Set<string>;
} {
    const files = new Map<string, string>();
    const dirs = new Set<string>();

    const fs: ShelfFs & { files: Map<string, string>; dirs: Set<string> } = {
        files,
        dirs,
        join: (...parts: string[]) => parts.join("/").replace(/\/+/g, "/"),
        async mkdir(target: string, options?: { recursive?: boolean }) {
            dirs.add(target);
            if (options?.recursive) {
                const parts = target.split("/").filter((part) => part.length > 0);
                let built = target.startsWith("/") ? "" : "";
                for (const part of parts) {
                    built = built ? `${built}/${part}` : target.startsWith("/") ? `/${part}` : part;
                    dirs.add(built);
                }
            }
        },
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
            for (const filePath of files.keys()) {
                if (filePath.startsWith(prefix)) {
                    const rest = filePath.slice(prefix.length);
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
        async writeFile(path: string, data: string) {
            files.set(path, data);
        },
        async rm(path: string) {
            dirs.delete(path);
            for (const key of files.keys()) {
                if (key.startsWith(`${path}/`) || key === path) {
                    files.delete(key);
                }
            }
        },
        async rename(from: string, to: string) {
            if (dirs.has(from)) {
                dirs.add(to);
                dirs.delete(from);
            }
            for (const key of [...files.keys()]) {
                if (key === from) {
                    files.set(to, files.get(key)!);
                    files.delete(key);
                } else if (key.startsWith(`${from}/`)) {
                    const rest = key.slice(from.length);
                    files.set(`${to}${rest}`, files.get(key)!);
                    files.delete(key);
                }
            }
            for (const dir of [...dirs]) {
                if (dir.startsWith(`${from}/`)) {
                    dirs.add(`${to}${dir.slice(from.length)}`);
                    dirs.delete(dir);
                }
            }
        },
        async stat(path: string) {
            if (!dirs.has(path) && !files.has(path)) {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            }
            return { isDirectory: () => dirs.has(path) };
        },
        async realpath(path: string) {
            return path;
        },
    };
    return fs;
}

describe("createShelfService", () => {
    it("createBook writes the given title", async () => {
        const fs = createMemoryFs();
        const service = createShelfService(
            "/lib",
            fs,
            () => "550e8400-e29b-41d4-a716-446655440000",
        );

        const created = await service.createBook("  My Novel  ");
        expect(created.title).toBe("My Novel");
        const manifest = fs.files.get("/lib/books/My Novel/book.json");
        expect(manifest).toContain('"title": "My Novel"');
    });

    it("createBook disambiguates folder when sanitized titles collide (foobar vs foo/bar)", async () => {
        const fs = createMemoryFs();
        const service = createShelfService(
            "/lib",
            fs,
            (() => {
                let n = 0;
                return () =>
                    n++ === 0
                        ? "550e8400-e29b-41d4-a716-446655440000"
                        : "660e8400-e29b-41d4-a716-446655440001";
            })(),
        );

        await service.createBook("foobar");
        const second = await service.createBook("foo/bar");
        expect(second.title).toBe("foo/bar");
        expect(fs.files.has("/lib/books/foobar/book.json")).toBe(true);
        expect(fs.files.has("/lib/books/foobar 2/book.json")).toBe(true);
        const secondManifest = fs.files.get("/lib/books/foobar 2/book.json");
        expect(secondManifest).toContain(
            '"id": "660e8400-e29b-41d4-a716-446655440001"',
        );
    });

    it("rejects empty titles on create", async () => {
        const fs = createMemoryFs();
        const service = createShelfService("/lib", fs);

        await expect(service.createBook("   ")).rejects.toMatchObject({
            code: "INVALID_BOOK_TITLE",
        });
    });

    it("suggestNewBookTitle returns Untitled then Untitled 2", async () => {
        const fs = createMemoryFs();
        const service = createShelfService(
            "/lib",
            fs,
            (() => {
                let n = 0;
                return () =>
                    n++ === 0
                        ? "550e8400-e29b-41d4-a716-446655440000"
                        : "660e8400-e29b-41d4-a716-446655440001";
            })(),
        );

        await expect(service.suggestNewBookTitle()).resolves.toBe("Untitled");
        await service.createBook("Untitled");
        await expect(service.suggestNewBookTitle()).resolves.toBe("Untitled 2");
    });

    it("renameBook updates manifest title", async () => {
        const fs = createMemoryFs();
        const id = "550e8400-e29b-41d4-a716-446655440000";
        const service = createShelfService(
            "/lib",
            fs,
            () => id,
        );
        await service.createBook("Old");

        const updated = await service.renameBook(id, "New Name");
        expect(updated.title).toBe("New Name");
        const manifest = fs.files.get("/lib/books/New Name/book.json");
        expect(manifest).toContain('"title": "New Name"');
        expect(manifest).toContain(`"id": "${id}"`);
        expect(fs.dirs.has("/lib/books/Old")).toBe(false);
    });

    it("rejects createBook when title already exists", async () => {
        const fs = createMemoryFs();
        const service = createShelfService(
            "/lib",
            fs,
            (() => {
                let n = 0;
                return () =>
                    n++ === 0
                        ? "550e8400-e29b-41d4-a716-446655440000"
                        : "660e8400-e29b-41d4-a716-446655440001";
            })(),
        );
        await service.createBook("Shared");

        await expect(service.createBook("Shared")).rejects.toMatchObject({
            code: "DUPLICATE_BOOK_TITLE",
        });
        expect(fs.files.has("/lib/books/Shared/book.json")).toBe(true);
        expect(
            fs.files.has(
                "/lib/books/660e8400-e29b-41d4-a716-446655440001/book.json",
            ),
        ).toBe(false);
    });

    it("renameBook disambiguates folder when sanitized title collides with another book", async () => {
        const fs = createMemoryFs();
        const idA = "550e8400-e29b-41d4-a716-446655440000";
        const idB = "660e8400-e29b-41d4-a716-446655440001";
        const service = createShelfService(
            "/lib",
            fs,
            (() => {
                let n = 0;
                return () => (n++ === 0 ? idA : idB);
            })(),
        );
        await service.createBook("foobar");
        await service.createBook("Other");

        const updated = await service.renameBook(idB, "foo/bar");
        expect(updated.title).toBe("foo/bar");
        expect(fs.files.get("/lib/books/foobar 2/book.json")).toContain(
            `"id": "${idB}"`,
        );
        expect(fs.files.get("/lib/books/foobar/book.json")).toContain(
            `"id": "${idA}"`,
        );
    });

    it("rejects renameBook when title is taken by another book", async () => {
        const fs = createMemoryFs();
        const firstId = "550e8400-e29b-41d4-a716-446655440000";
        const secondId = "660e8400-e29b-41d4-a716-446655440001";
        const service = createShelfService(
            "/lib",
            fs,
            (() => {
                let n = 0;
                return () => (n++ === 0 ? firstId : secondId);
            })(),
        );
        await service.createBook("First");
        await service.createBook("Second");

        await expect(service.renameBook(secondId, "First")).rejects.toMatchObject(
            { code: "DUPLICATE_BOOK_TITLE" },
        );
        const secondManifest = fs.files.get("/lib/books/Second/book.json");
        expect(secondManifest).toContain('"title": "Second"');
    });

    it("allows renameBook when title is unchanged", async () => {
        const fs = createMemoryFs();
        const id = "550e8400-e29b-41d4-a716-446655440000";
        const service = createShelfService("/lib", fs, () => id);
        await service.createBook("Same");

        await expect(service.renameBook(id, "Same")).resolves.toMatchObject({
            title: "Same",
        });
    });

    it("migrates legacy uuid directories to title names on list", async () => {
        const fs = createMemoryFs();
        const id = "550e8400-e29b-41d4-a716-446655440000";
        await fs.mkdir(`/lib/books/${id}`, { recursive: true });
        await fs.writeFile(
            `/lib/books/${id}/book.json`,
            JSON.stringify({
                version: 1,
                id,
                title: "Legacy Title",
                createdAt: "2026-01-01T00:00:00.000Z",
            }),
            "utf8",
        );
        const service = createShelfService("/lib", fs);
        const books = await service.listBooks();
        expect(books).toHaveLength(1);
        expect(fs.files.has("/lib/books/Legacy Title/book.json")).toBe(true);
        expect(fs.dirs.has(`/lib/books/${id}`)).toBe(false);
    });

    it("renameBook throws BOOK_NOT_FOUND for missing book", async () => {
        const fs = createMemoryFs();
        const service = createShelfService("/lib", fs);

        await expect(
            service.renameBook(
                "550e8400-e29b-41d4-a716-446655440000",
                "X",
            ),
        ).rejects.toMatchObject({ code: "BOOK_NOT_FOUND" });
    });
});
