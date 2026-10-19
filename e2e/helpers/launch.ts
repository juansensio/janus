import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import type { ElectronApplication } from "@playwright/test";
import { _electron as electron } from "@playwright/test";
import { resolveElectronSlowMoMs } from "./launch-mode";
import { desktopAppDir, repoRoot } from "./paths";

const require = createRequire(import.meta.url);

export type JanusLaunchDirs = {
    userDataDir: string;
    libraryRoot: string;
    autoPdfExportPath: string;
};

export async function makeIsolatedJanusDirs(): Promise<JanusLaunchDirs> {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), "janus-e2e-"));
    return {
        userDataDir: path.join(base, "user-data"),
        libraryRoot: path.join(base, "library"),
        autoPdfExportPath: path.join(base, "export.pdf"),
    };
}

export async function removeJanusDirs(dirs: JanusLaunchDirs): Promise<void> {
    const base = path.dirname(dirs.userDataDir);
    await fs.rm(base, { recursive: true, force: true });
}

function electronExecutablePath(): string {
    return require("electron") as string;
}

export async function launchJanusApp(
    dirs: JanusLaunchDirs,
): Promise<ElectronApplication> {
    await fs.mkdir(dirs.userDataDir, { recursive: true });
    await fs.mkdir(dirs.libraryRoot, { recursive: true });

    const linuxCiArgs =
        process.platform === "linux"
            ? ["--no-sandbox", "--disable-dev-shm-usage"]
            : [];

    const slowMo = resolveElectronSlowMoMs();

    const app = await electron.launch({
        executablePath: electronExecutablePath(),
        cwd: repoRoot,
        args: [
            desktopAppDir,
            `--user-data-dir=${dirs.userDataDir}`,
            ...linuxCiArgs,
        ],
        env: {
            ...process.env,
            JANUS_LIBRARY_ROOT: dirs.libraryRoot,
            JANUS_E2E_AUTO_PDF_PATH: dirs.autoPdfExportPath,
        },
        timeout: 60_000,
        ...(slowMo > 0 ? { slowMo } : {}),
    });

    return app;
}

export async function firstWindow(
    app: ElectronApplication,
): Promise<import("@playwright/test").Page> {
    const page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    return page;
}
