import { existsSync } from "node:fs";
import path from "node:path";
import { $ } from "bun";

const root = path.resolve(import.meta.dir, "..");
const uiDir = path.join(root, "dist", "ui");

async function main(): Promise<void> {
    await $`bun run test`.cwd(root);
    await $`bun run build:ui`.cwd(root);

    const required = ["index.html", "assets"];
    for (const name of required) {
        const full = path.join(uiDir, name);
        if (!existsSync(full)) {
            console.error(`validate:install missing artifact: ${full}`);
            process.exit(1);
        }
    }

    const html = await Bun.file(path.join(uiDir, "index.html")).text();
    if (!html.includes('id="app"')) {
        console.error("validate:install: built index.html missing #app");
        process.exit(1);
    }

    console.log("validate:install OK");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
