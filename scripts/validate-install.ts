import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";
import {
    assertBuiltIndexHtml,
    assertBuiltJsContainsShellLabel,
} from "./validate-built-ui";

const root = path.resolve(import.meta.dir, "..");
const uiDir = path.join(root, "dist", "ui");

function fail(message: string): never {
    console.error(message);
    process.exit(1);
}

async function main(): Promise<void> {
    await $`bun run test`.cwd(root);
    await $`bun run build:ui`.cwd(root);

    const required = ["index.html", "assets"];
    for (const name of required) {
        const full = path.join(uiDir, name);
        if (!existsSync(full)) {
            fail(`validate:install missing artifact: ${full}`);
        }
    }

    const html = await Bun.file(path.join(uiDir, "index.html")).text();
    try {
        assertBuiltIndexHtml(html);
    } catch (err) {
        fail(err instanceof Error ? err.message : String(err));
    }

    const assetsDir = path.join(uiDir, "assets");
    const jsFiles = readdirSync(assetsDir).filter((name) =>
        name.endsWith(".js"),
    );
    if (jsFiles.length === 0) {
        fail("validate:install: no .js files under dist/ui/assets");
    }
    let labelFound = false;
    for (const name of jsFiles) {
        const js = await Bun.file(path.join(assetsDir, name)).text();
        try {
            assertBuiltJsContainsShellLabel(js);
            labelFound = true;
            break;
        } catch {
            // try next chunk (e.g. vendor split)
        }
    }
    if (!labelFound) {
        fail(
            "validate:install: built JS bundle missing shell label text Janus",
        );
    }

    console.log("validate:install OK");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
