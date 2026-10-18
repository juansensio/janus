import { describe, expect, it } from "vitest";
import {
    defaultUserDataLibraryPath,
    devLibraryPath,
    migrateUserDataLibraryToDevRoot,
    resolveLibraryRoot,
    type LibraryRootFs,
} from "./library-root";

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
                    for (const dir of dirs) {
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

describe("resolveLibraryRoot", () => {
    it("prefers JANUS_LIBRARY_ROOT over dev default", () => {
        const resolved = resolveLibraryRoot({
            env: { JANUS_LIBRARY_ROOT: "/tmp/custom-lib" },
            repoRoot: "repo",
            userDataPath: "user",
            settings: {},
            isDev: true,
        });
        expect(resolved).toEqual({ path: "/tmp/custom-lib", source: "env" });
    });

    it("uses dev default when JANUS_DEV and no env override", () => {
        const resolved = resolveLibraryRoot({
            env: {},
            repoRoot: "repo",
            userDataPath: "user",
            settings: { libraryRoot: "/saved" },
            isDev: true,
        });
        expect(resolved).toEqual({
            path: devLibraryPath("repo"),
            source: "dev-default",
        });
    });

    it("uses settings in production before user-data fallback", () => {
        const resolved = resolveLibraryRoot({
            env: {},
            repoRoot: "repo",
            userDataPath: "user",
            settings: { libraryRoot: "/Volumes/Books/Janus" },
            isDev: false,
        });
        expect(resolved).toEqual({
            path: "/Volumes/Books/Janus",
            source: "settings",
        });
    });

    it("falls back to userData/library", () => {
        const resolved = resolveLibraryRoot({
            env: {},
            repoRoot: "repo",
            userDataPath: "user",
            settings: {},
            isDev: false,
        });
        expect(resolved).toEqual({
            path: defaultUserDataLibraryPath("user"),
            source: "user-data",
        });
    });
});

describe("migrateUserDataLibraryToDevRoot", () => {
    it("renames legacy userData/library to dev root when dev root is missing", async () => {
        const fs = createMemoryFs();
        const legacy = defaultUserDataLibraryPath("user");
        await fs.mkdir(`${legacy}/books/book-id`, { recursive: true });
        await fs.writeFile(`${legacy}/books/book-id/book.json`, "{}", "utf8");

        await migrateUserDataLibraryToDevRoot(
            "user",
            devLibraryPath("repo"),
            fs,
        );

        expect(fs.dirs.has(devLibraryPath("repo"))).toBe(true);
        expect(fs.files.has(`${devLibraryPath("repo")}/books/book-id/book.json`)).toBe(
            true,
        );
        expect(fs.dirs.has(legacy)).toBe(false);
    });
});
