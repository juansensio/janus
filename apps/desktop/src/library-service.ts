import path from "node:path";
import type { Dirent } from "node:fs";
import {
    createShelfService,
    type ShelfFs,
    type ShelfService,
} from "@janus/library";

export type LibraryFs = ShelfFs;

export type LibraryService = ShelfService;

export function createLibraryService(
    libraryRoot: string,
    fs: Omit<ShelfFs, "join"> & { join?: ShelfFs["join"] },
    createId?: () => string,
): LibraryService {
    const shelfFs: ShelfFs = {
        ...fs,
        join: fs.join ?? ((...parts: string[]) => path.join(...parts)),
    };
    return createShelfService(libraryRoot, shelfFs, createId);
}

export type { Dirent };
