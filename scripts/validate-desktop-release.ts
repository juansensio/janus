import { existsSync } from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dir, "..");
const defaultApp = path.join(
    root,
    "apps/desktop/release/mac-arm64/Janus.app",
);

function fail(message: string): never {
    console.error(message);
    process.exit(1);
}

function resolveAppPath(): string {
    const arg = process.argv[2];
    if (arg) {
        return path.resolve(arg);
    }
    return defaultApp;
}

async function main(): Promise<void> {
    const appPath = resolveAppPath();
    const indexHtml = path.join(
        appPath,
        "Contents/Resources/ui/index.html",
    );
    if (!existsSync(appPath)) {
        fail(`validate-desktop-release: app not found: ${appPath}`);
    }
    if (!existsSync(indexHtml)) {
        fail(
            `validate-desktop-release: missing packaged UI: ${indexHtml}\nRun bun run desktop:package first.`,
        );
    }
    const assetsDir = path.join(appPath, "Contents/Resources/ui/assets");
    if (!existsSync(assetsDir)) {
        fail(`validate-desktop-release: missing ui assets: ${assetsDir}`);
    }
    console.log(`validate-desktop-release: ok (${appPath})`);
}

await main();
