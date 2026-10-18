import { bookDirectoryName, uniqueDirectoryName } from "./book-directory-name";
import { parseManifest } from "./book-manifest";
import { isSkippableListError } from "./list-errors";
import { validateBookId } from "./validate-book-id";
export type MigrateLegacyUuidDirsFs = {
    join(...parts: string[]): string;
    readdir(
        path: string,
        options?: { withFileTypes?: boolean },
    ): Promise<
        string[] | { name: string; isDirectory(): boolean }[]
    >;
    readFile(path: string, encoding: "utf8"): Promise<string>;
    stat(path: string): Promise<{ isDirectory(): boolean }>;
    rename(from: string, to: string): Promise<void>;
};

/** Renames `books/<uuid>/` folders to title-based names when safe. */
export async function migrateLegacyUuidBookDirectories(
    booksDir: string,
    fs: MigrateLegacyUuidDirsFs,
): Promise<void> {
    let entries: string[] | { name: string; isDirectory(): boolean }[];
    try {
        entries = await fs.readdir(booksDir, { withFileTypes: true });
    } catch {
        return;
    }

    const taken = new Set<string>();
    for (const entry of entries) {
        const name = typeof entry === "string" ? entry : entry.name;
        taken.add(name);
    }

    for (const entry of entries) {
        const name = typeof entry === "string" ? entry : entry.name;
        if (!validateBookId(name)) {
            continue;
        }
        const isDir =
            typeof entry === "string"
                ? (await fs.stat(fs.join(booksDir, name))).isDirectory()
                : entry.isDirectory();
        if (!isDir) {
            continue;
        }
        const manifestPath = fs.join(booksDir, name, "book.json");
        let manifest;
        try {
            const raw = await fs.readFile(manifestPath, "utf8");
            manifest = parseManifest(raw, name);
        } catch (error) {
            if (isSkippableListError(error)) {
                continue;
            }
            throw error;
        }
        const targetBase = bookDirectoryName(manifest.title);
        if (targetBase === name) {
            continue;
        }
        const targetName = uniqueDirectoryName(targetBase, taken);
        if (targetName === name) {
            continue;
        }
        const from = fs.join(booksDir, name);
        const to = fs.join(booksDir, targetName);
        await fs.rename(from, to);
        taken.delete(name);
        taken.add(targetName);
    }
}
