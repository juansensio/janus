import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dir, "..");
const electronDir = path.join(root, "node_modules", "electron");

if (!existsSync(path.join(electronDir, "install.js"))) {
    console.error("ensure-electron: electron is not installed (run bun install)");
    process.exit(1);
}

function platformRelativePath(): string {
    switch (process.platform) {
        case "darwin":
            return "Electron.app/Contents/MacOS/Electron";
        case "win32":
            return "electron.exe";
        default:
            return "electron";
    }
}

function pkgVersion(): string {
    return JSON.parse(readFileSync(path.join(electronDir, "package.json"), "utf8")).version as string;
}

function frameworkPath(): string {
    return path.join(
        electronDir,
        "dist",
        "Electron.app/Contents/Frameworks/Electron Framework.framework/Electron Framework",
    );
}

function isDistComplete(): boolean {
    const binary = path.join(electronDir, "dist", platformRelativePath());
    const versionFile = path.join(electronDir, "dist", "version");

    if (!existsSync(binary) || !existsSync(versionFile)) {
        return false;
    }

    const distVersion = readFileSync(versionFile, "utf8").trim().replace(/^v/, "");
    if (distVersion !== pkgVersion()) {
        return false;
    }

    if (process.platform === "darwin" && !existsSync(frameworkPath())) {
        return false;
    }

    return true;
}

function writePathTxt(): void {
    writeFileSync(path.join(electronDir, "path.txt"), platformRelativePath(), "utf8");
}

function resetDist(): void {
    for (const name of ["dist", "path.txt"]) {
        const target = path.join(electronDir, name);
        if (existsSync(target)) {
            rmSync(target, { recursive: true, force: true });
        }
    }
}

function runElectronInstall(): void {
    const result = spawnSync(process.execPath, [path.join(electronDir, "install.js")], {
        cwd: root,
        stdio: "inherit",
        env: {
            ...process.env,
            force_no_cache: "true",
        },
        timeout: 10 * 60 * 1000,
    });

    if (result.status !== 0) {
        console.error("ensure-electron: electron install.js failed");
        process.exit(result.status === null ? 1 : result.status);
    }
}

if (isDistComplete()) {
    writePathTxt();
    process.exit(0);
}

console.log("ensure-electron: installing a complete Electron app (this can take a minute)…");
resetDist();
runElectronInstall();

if (!isDistComplete()) {
    console.error(
        "ensure-electron: install finished but Electron.app is still incomplete.",
    );
    console.error("Try: rm -rf node_modules/electron && bun install && bun run ensure:electron");
    process.exit(1);
}

writePathTxt();
