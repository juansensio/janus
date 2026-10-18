import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncCapIndexFromMobile } from "./cap-web";

const tempDirs: string[] = [];

afterEach(() => {
    tempDirs.length = 0;
});

function makeUiDir(): string {
    const dir = mkdtempSync(path.join(tmpdir(), "janus-cap-web-"));
    tempDirs.push(dir);
    return dir;
}

describe("syncCapIndexFromMobile", () => {
    it("copies mobile.html over index.html", () => {
        const uiDir = makeUiDir();
        writeFileSync(
            path.join(uiDir, "mobile.html"),
            '<main id="app">mobile</main>',
        );
        writeFileSync(path.join(uiDir, "index.html"), "<main id=\"app\">desktop</main>");

        syncCapIndexFromMobile(uiDir);

        expect(readFileSync(path.join(uiDir, "index.html"), "utf8")).toBe(
            '<main id="app">mobile</main>',
        );
    });

    it("throws when mobile.html is missing", () => {
        const uiDir = makeUiDir();
        expect(() => syncCapIndexFromMobile(uiDir)).toThrow(/mobile\.html/);
    });
});
