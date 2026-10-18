import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dir, "../../..");
const uiDir = path.join(root, "dist", "ui");
const mobileHtml = path.join(uiDir, "mobile.html");
const indexHtml = path.join(uiDir, "index.html");

if (!existsSync(mobileHtml)) {
    console.error(
        "prepare-cap-web: missing dist/ui/mobile.html — run build:ui first",
    );
    process.exit(1);
}

copyFileSync(mobileHtml, indexHtml);
console.log("prepare-cap-web: dist/ui/index.html set from mobile.html");
