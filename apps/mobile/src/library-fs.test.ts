import { describe, expect, it, vi, beforeEach } from "vitest";
import { createShelfService } from "@janus/library";

const store = new Map<string, string>();

vi.mock("@capacitor/filesystem", () => {
    const Directory = { Data: "DATA" };
    const Encoding = { UTF8: "utf8" };

    return {
        Directory,
        Encoding,
        Filesystem: {
            mkdir: vi.fn(async ({ path }: { path: string }) => {
                if (!store.has(path)) {
                    store.set(path, "");
                }
            }),
            readdir: vi.fn(async ({ path }: { path: string }) => {
                const prefix = `${path}/`;
                const names = new Set<string>();
                for (const key of store.keys()) {
                    if (!key.startsWith(prefix)) {
                        continue;
                    }
                    const rest = key.slice(prefix.length);
                    const segment = rest.split("/")[0];
                    if (segment) {
                        names.add(segment);
                    }
                }
                return {
                    files: [...names].map((name) => {
                        const childPath = `${path}/${name}`;
                        const isDir = [...store.keys()].some(
                            (key) =>
                                key.startsWith(`${childPath}/`) ||
                                key === childPath,
                        );
                        return {
                            name,
                            type: isDir ? "directory" : "file",
                        };
                    }),
                };
            }),
            readFile: vi.fn(async ({ path }: { path: string }) => ({
                data: store.get(path) ?? "",
            })),
            writeFile: vi.fn(
                async ({ path, data }: { path: string; data: string }) => {
                    store.set(path, data);
                },
            ),
            rmdir: vi.fn(async ({ path }: { path: string }) => {
                for (const key of store.keys()) {
                    if (key === path || key.startsWith(`${path}/`)) {
                        store.delete(key);
                    }
                }
            }),
            stat: vi.fn(async ({ path }: { path: string }) => {
                const hasChildren = [...store.keys()].some(
                    (key) => key.startsWith(`${path}/`),
                );
                if (!store.has(path) && !hasChildren) {
                    throw new Error("ENOENT");
                }
                return {
                    type: hasChildren || !store.get(path) ? "directory" : "file",
                };
            }),
        },
    };
});

import { createCapacitorShelfFs } from "./library-fs";

beforeEach(() => {
    store.clear();
});

describe("createCapacitorShelfFs", () => {
    it("supports create/list/delete through shelf service", async () => {
        const service = createShelfService(
            "library",
            createCapacitorShelfFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );

        const created = await service.createBook("Untitled");
        expect(created.title).toBe("Untitled");
        await expect(service.listBooks()).resolves.toHaveLength(1);
        await service.deleteBook(created.id);
        await expect(service.listBooks()).resolves.toEqual([]);
    });
});
