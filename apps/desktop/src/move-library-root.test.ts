import { describe, expect, it } from "vitest";
import { LibraryBridgeError } from "./library-errors";
import type { LibraryRootFs } from "./library-root";
import { moveLibraryContents } from "./move-library-root";

function createMemoryFs(): LibraryRootFs & {
    files: Map<string, string>;
    dirs: Set<string>;
} {
    const files = new Map<string, string>();
    const dirs = new Set<string>();

    const fs: LibraryRootFs & { files: Map<string, string>; dirs: Set<string> } =
        {
            files,
            dirs,
            async mkdir(target, options) {
                dirs.add(target);
                if (options?.recursive) {
                    const parts = target.split("/");
                    let built = "";
                    for (const part of parts) {
                        if (!part) {
                            continue;
                        }
                        built = built ? `${built}/${part}` : part;
                        dirs.add(built);
                    }
                }
            },
            async readFile(target) {
                const value = files.get(target);
                if (value === undefined) {
                    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
                }
                return value;
            },
            async writeFile(target, data) {
                files.set(target, data);
            },
            async rename(from, to) {
                if (files.has(from)) {
                    files.set(to, files.get(from)!);
                    files.delete(from);
                }
                if (dirs.has(from)) {
                    dirs.add(to);
                    dirs.delete(from);
                    for (const key of files.keys()) {
                        if (key.startsWith(`${from}/`)) {
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
                }
            },
            async readdir(target) {
                const prefix = target.endsWith("/") ? target : `${target}/`;
                const names = new Set<string>();
                for (const dir of dirs) {
                    if (dir.startsWith(prefix) && dir !== target) {
                        const rest = dir.slice(prefix.length);
                        if (!rest.includes("/")) {
                            names.add(rest);
                        }
                    }
                }
                for (const file of files.keys()) {
                    if (file.startsWith(prefix)) {
                        const rest = file.slice(prefix.length);
                        if (!rest.includes("/")) {
                            names.add(rest);
                        }
                    }
                }
                return [...names];
            },
            async stat(target) {
                if (!dirs.has(target) && !files.has(target)) {
                    throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
                }
                return { isDirectory: () => dirs.has(target) };
            },
        };
    return fs;
}

describe("moveLibraryContents", () => {
    it("moves book dirs and manuscript files to the new root", async () => {
        const fs = createMemoryFs();
        const from = "old/lib";
        const to = "new/lib";
        await fs.mkdir(`${from}/books/book-a`, { recursive: true });
        await fs.writeFile(
            `${from}/books/book-a/manuscript.md`,
            "hello",
            "utf8",
        );

        await moveLibraryContents(from, to, fs);

        expect(fs.files.has(`${to}/books/book-a/manuscript.md`)).toBe(true);
        expect(fs.dirs.has(`${from}/books`)).toBe(false);
    });

    it("rejects when destination books is non-empty", async () => {
        const fs = createMemoryFs();
        await fs.mkdir("dest/books/existing", { recursive: true });
        await fs.mkdir("src/books/other", { recursive: true });

        await expect(
            moveLibraryContents("src", "dest", fs),
        ).rejects.toMatchObject({
            code: "LIBRARY_ROOT_NOT_EMPTY",
        });
    });

    it("no-ops when from and to are the same path", async () => {
        const fs = createMemoryFs();
        await fs.mkdir("lib/books/a", { recursive: true });
        await fs.writeFile("lib/books/a/book.json", "{}", "utf8");

        await moveLibraryContents("lib", "lib", fs);

        expect(fs.files.get("lib/books/a/book.json")).toBe("{}");
    });

    it("throws LibraryBridgeError for non-empty destination", async () => {
        const fs = createMemoryFs();
        await fs.mkdir("dest/books/x", { recursive: true });
        await fs.mkdir("src/books/y", { recursive: true });

        await expect(moveLibraryContents("src", "dest", fs)).rejects.toBeInstanceOf(
            LibraryBridgeError,
        );
    });
});
