import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedLibraryRoot } from "./library-root";
import {
    ensureLibraryRootDir,
    loadJanusSettings,
    migrateUserDataLibraryToDevRoot,
    resolveLibraryRoot,
    type LibraryRootFs,
} from "./library-root";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function desktopRepoRoot(): string {
    return path.resolve(__dirname, "../../..");
}

export type DesktopLibraryContext = {
    resolved: ResolvedLibraryRoot;
    settings: Awaited<ReturnType<typeof loadJanusSettings>>;
};

export async function initDesktopLibraryContext(options: {
    env: NodeJS.ProcessEnv;
    userDataPath: string;
    isDev: boolean;
    fs: LibraryRootFs;
}): Promise<DesktopLibraryContext> {
    const settings = await loadJanusSettings(options.userDataPath, options.fs);
    const resolved = resolveLibraryRoot({
        env: options.env,
        repoRoot: desktopRepoRoot(),
        userDataPath: options.userDataPath,
        settings,
        isDev: options.isDev,
    });
    if (resolved.source === "dev-default") {
        await migrateUserDataLibraryToDevRoot(
            options.userDataPath,
            resolved.path,
            options.fs,
        );
    }
    await ensureLibraryRootDir(resolved.path, options.fs);
    return { resolved, settings };
}
