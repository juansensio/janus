import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";

const root = path.resolve(import.meta.dir, "..");
const nodeModules = path.join(root, "node_modules");

function findEsbuildBinaries(): string[] {
    const found = new Set<string>();

    const shim = path.join(nodeModules, "esbuild", "bin", "esbuild");
    if (existsSync(shim)) {
        found.add(shim);
    }

    const platformDir = path.join(nodeModules, "@esbuild");
    if (existsSync(platformDir)) {
        for (const entry of readdirSync(platformDir)) {
            const binary = path.join(platformDir, entry, "bin", "esbuild");
            if (existsSync(binary)) {
                found.add(binary);
            }
        }
    }

    return [...found];
}

function adhocSign(binaryPath: string): void {
    const result = spawnSync("codesign", ["-s", "-", "--force", binaryPath], {
        stdio: "pipe",
        encoding: "utf8",
    });
    if (result.status !== 0) {
        const detail = result.stderr?.trim() || result.stdout?.trim();
        console.error(`ensure-esbuild: codesign failed for ${binaryPath}`);
        if (detail) {
            console.error(detail);
        }
        process.exit(result.status === null ? 1 : result.status);
    }
}

function verifyEsbuildApi(): void {
    const esbuildMain = path.join(nodeModules, "esbuild", "lib", "main.js");
    if (!existsSync(esbuildMain)) {
        console.error("ensure-esbuild: esbuild is not installed (run bun install)");
        process.exit(1);
    }

    const snippet = `
        import esbuild from ${JSON.stringify(esbuildMain)};
        esbuild.transformSync("const x = 1", { loader: "ts" });
    `;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", snippet], {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
    });
    if (result.status !== 0) {
        console.error("ensure-esbuild: esbuild API smoke check failed");
        if (result.stderr) {
            console.error(result.stderr);
        }
        process.exit(result.status === null ? 1 : result.status);
    }
}

function main(): void {
    if (process.platform !== "darwin") {
        return;
    }

    const binaries = findEsbuildBinaries();
    if (binaries.length === 0) {
        console.error("ensure-esbuild: no esbuild binaries found under node_modules");
        process.exit(1);
    }

    for (const binary of binaries) {
        if (!statSync(binary).isFile()) {
            continue;
        }
        adhocSign(binary);
    }

    verifyEsbuildApi();
}

main();
