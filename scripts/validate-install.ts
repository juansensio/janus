import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";
import {
    assertBuiltJsContainsShellLabel,
    assertBuiltShellHtml,
} from "./validate-built-ui";

const root = path.resolve(import.meta.dir, "..");
const uiDir = path.join(root, "dist", "ui");

function fail(message: string): never {
    console.error(message);
    process.exit(1);
}

async function main(): Promise<void> {
    await $`bun run ensure:esbuild`.cwd(root);
    await $`bun run test`.cwd(root);
    await $`bun run build:ui`.cwd(root);

    const required = ["index.html", "mobile.html", "assets"];
    for (const name of required) {
        const full = path.join(uiDir, name);
        if (!existsSync(full)) {
            fail(`validate:install missing artifact: ${full}`);
        }
    }

    for (const htmlName of ["index.html", "mobile.html"] as const) {
        const html = await Bun.file(path.join(uiDir, htmlName)).text();
        try {
            assertBuiltShellHtml(html, htmlName);
        } catch (err) {
            fail(err instanceof Error ? err.message : String(err));
        }
    }

    const assetsDir = path.join(uiDir, "assets");
    const jsFiles = readdirSync(assetsDir).filter((name) =>
        name.endsWith(".js"),
    );
    if (jsFiles.length === 0) {
        fail("validate:install: no .js files under dist/ui/assets");
    }
    const bootstrapChunks = jsFiles.filter((name) =>
        name.startsWith("bootstrap-"),
    );
    const labelCandidates =
        bootstrapChunks.length > 0 ? bootstrapChunks : jsFiles;
    let labelFound = false;
    let lastLabelError = "";
    for (const name of labelCandidates) {
        const js = await Bun.file(path.join(assetsDir, name)).text();
        try {
            assertBuiltJsContainsShellLabel(js);
            labelFound = true;
            break;
        } catch (err) {
            lastLabelError =
                err instanceof Error ? err.message : String(err);
        }
    }
    if (!labelFound) {
        fail(
            lastLabelError ||
                "validate:install: built JS bundle missing shell mount path",
        );
    }

    console.log("validate:install OK");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
