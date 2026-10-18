import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

export function syncCapIndexFromMobile(uiDir: string): void {
    const mobileHtml = path.join(uiDir, "mobile.html");
    const indexHtml = path.join(uiDir, "index.html");

    if (!existsSync(mobileHtml)) {
        throw new Error(
            `prepare-cap-web: missing ${mobileHtml} — run build:ui first`,
        );
    }

    copyFileSync(mobileHtml, indexHtml);
}
