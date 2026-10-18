import path from "node:path";
import { LibraryBridgeError } from "./library-errors";
import type { LibraryRootFs } from "./library-root";

async function pathExists(fs: LibraryRootFs, target: string): Promise<boolean> {
    try {
        await fs.stat(target);
        return true;
    } catch {
        return false;
    }
}

async function directoryIsEmpty(fs: LibraryRootFs, dir: string): Promise<boolean> {
    if (!(await pathExists(fs, dir))) {
        return true;
    }
    const entries = await fs.readdir(dir);
    return entries.length === 0;
}

/**
 * Moves all book directories from `fromRoot/books` into `toRoot/books`.
 * Rejects when destination `books/` exists and is non-empty.
 */
export async function moveLibraryContents(
    fromRoot: string,
    toRoot: string,
    fs: LibraryRootFs,
): Promise<void> {
    if (path.resolve(fromRoot) === path.resolve(toRoot)) {
        return;
    }

    const destBooks = path.join(toRoot, "books");
    if (!(await directoryIsEmpty(fs, destBooks))) {
        throw new LibraryBridgeError(
            "LIBRARY_ROOT_NOT_EMPTY",
            "The chosen folder already contains books",
        );
    }

    const sourceBooks = path.join(fromRoot, "books");
    if (!(await pathExists(fs, sourceBooks))) {
        await fs.mkdir(destBooks, { recursive: true });
        return;
    }

    await fs.mkdir(toRoot, { recursive: true });

    if (!(await pathExists(fs, destBooks))) {
        await fs.rename(sourceBooks, destBooks);
        return;
    }

    const entries = await fs.readdir(sourceBooks);
    for (const name of entries) {
        await fs.rename(
            path.join(sourceBooks, name),
            path.join(destBooks, name),
        );
    }
}
