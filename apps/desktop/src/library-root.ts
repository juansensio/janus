import path from "node:path";
import {
    normalizeJanusSettings,
    type JanusSettings,
} from "@janus/bridge";
import { LibraryBridgeError } from "./library-errors";

export const JANUS_SETTINGS_FILENAME = "janus-settings.json";
export const DEV_LIBRARY_DIRNAME = ".janus-library";

export type { JanusSettings };

export type LibraryRootSource =
    | "env"
    | "dev-default"
    | "settings"
    | "documents"
    | "user-data";

export type ResolvedLibraryRoot = {
    path: string;
    source: LibraryRootSource;
};

export type LibraryRootFs = {
    readFile(path: string, encoding: "utf8"): Promise<string>;
    writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    readdir(path: string): Promise<string[]>;
    stat(path: string): Promise<{ isDirectory(): boolean }>;
};

export function defaultUserDataLibraryPath(userDataPath: string): string {
    return path.join(userDataPath, "library");
}

export function devLibraryPath(repoRoot: string): string {
    return path.join(repoRoot, DEV_LIBRARY_DIRNAME);
}

export function defaultDocumentsLibraryPath(documentsPath: string): string {
    return path.join(documentsPath, "Janus");
}

export function isDevLibraryDirectory(absolutePath: string): boolean {
    return path.basename(path.resolve(absolutePath)) === DEV_LIBRARY_DIRNAME;
}

export function resolveLibraryRoot(options: {
    env: NodeJS.ProcessEnv;
    repoRoot: string;
    userDataPath: string;
    documentsPath: string;
    settings: JanusSettings;
    isDev: boolean;
    isPackaged: boolean;
}): ResolvedLibraryRoot {
    const envRoot = options.env.JANUS_LIBRARY_ROOT?.trim();
    if (envRoot) {
        if (!path.isAbsolute(envRoot)) {
            throw new LibraryBridgeError(
                "INVALID_LIBRARY_ROOT",
                "JANUS_LIBRARY_ROOT must be an absolute path",
            );
        }
        return { path: path.resolve(envRoot), source: "env" };
    }
    const settingsRoot = options.settings.libraryRoot?.trim();
    if (settingsRoot) {
        if (!path.isAbsolute(settingsRoot)) {
            throw new LibraryBridgeError(
                "INVALID_LIBRARY_ROOT",
                "Saved library path must be absolute",
            );
        }
        const resolvedSettings = path.resolve(settingsRoot);
        const staleDevPath =
            isDevLibraryDirectory(resolvedSettings) &&
            (options.isPackaged || !options.isDev);
        if (!staleDevPath) {
            return { path: resolvedSettings, source: "settings" };
        }
    }
    if (options.isDev) {
        return {
            path: devLibraryPath(options.repoRoot),
            source: "dev-default",
        };
    }
    return {
        path: defaultDocumentsLibraryPath(options.documentsPath),
        source: "documents",
    };
}

export async function loadJanusSettings(
    userDataPath: string,
    fs: Pick<LibraryRootFs, "readFile">,
): Promise<JanusSettings> {
    const settingsPath = path.join(userDataPath, JANUS_SETTINGS_FILENAME);
    try {
        const raw = await fs.readFile(settingsPath, "utf8");
        return normalizeJanusSettings(JSON.parse(raw));
    } catch {
        return {};
    }
}

export async function saveJanusSettings(
    userDataPath: string,
    settings: JanusSettings,
    fs: Pick<LibraryRootFs, "writeFile" | "mkdir">,
): Promise<void> {
    await fs.mkdir(userDataPath, { recursive: true });
    const settingsPath = path.join(userDataPath, JANUS_SETTINGS_FILENAME);
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

async function pathExists(fs: LibraryRootFs, target: string): Promise<boolean> {
    try {
        await fs.stat(target);
        return true;
    } catch {
        return false;
    }
}

async function booksDirIsEmpty(fs: LibraryRootFs, libraryRoot: string): Promise<boolean> {
    const booksDir = path.join(libraryRoot, "books");
    if (!(await pathExists(fs, booksDir))) {
        return true;
    }
    const entries = await fs.readdir(booksDir);
    return entries.length === 0;
}

/**
 * When dev uses `.janus-library`, move an existing Electron `userData/library`
 * tree into that folder so prior dev/prod data is not left behind.
 */
export async function migrateUserDataLibraryToDevRoot(
    userDataPath: string,
    devRoot: string,
    fs: LibraryRootFs,
): Promise<void> {
    const legacyRoot = defaultUserDataLibraryPath(userDataPath);
    if (legacyRoot === devRoot) {
        return;
    }
    if (!(await pathExists(fs, legacyRoot))) {
        return;
    }
    if (await pathExists(fs, devRoot)) {
        if (!(await booksDirIsEmpty(fs, devRoot))) {
            return;
        }
        const legacyBooks = path.join(legacyRoot, "books");
        if (await pathExists(fs, legacyBooks)) {
            const targetBooks = path.join(devRoot, "books");
            await fs.mkdir(devRoot, { recursive: true });
            await fs.rename(legacyBooks, targetBooks);
        }
        return;
    }
    await fs.rename(legacyRoot, devRoot);
}

export async function ensureLibraryRootDir(
    libraryRoot: string,
    fs: Pick<LibraryRootFs, "mkdir">,
): Promise<void> {
    await fs.mkdir(path.join(libraryRoot, "books"), { recursive: true });
}

export async function validateLibraryRootWritable(
    libraryRoot: string,
    fs: Pick<LibraryRootFs, "mkdir" | "writeFile" | "stat">,
): Promise<void> {
    if (!path.isAbsolute(libraryRoot)) {
        throw new LibraryBridgeError(
            "INVALID_LIBRARY_ROOT",
            "Library path must be absolute",
        );
    }
    await fs.mkdir(libraryRoot, { recursive: true });
    const probe = path.join(libraryRoot, ".janus-write-probe");
    try {
        await fs.writeFile(probe, "", "utf8");
        await fs.stat(probe);
    } catch {
        throw new LibraryBridgeError(
            "INVALID_LIBRARY_ROOT",
            "Library folder is not writable",
        );
    }
}
