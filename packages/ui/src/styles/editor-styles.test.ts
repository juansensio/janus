import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const editorCssPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "editor.css",
);

describe("editor.css", () => {
    it("styles editor scrollport scrollbars with theme tokens", () => {
        const css = readFileSync(editorCssPath, "utf8");
        const scrollportBlock =
            css.match(/\.editor-scrollport\s*\{[^}]+\}/)?.[0] ?? "";
        expect(scrollportBlock).toContain("scrollbar-width: thin");
        expect(scrollportBlock).toContain("scrollbar-color:");
        expect(css).toContain("--editor-scrollbar-thumb");
        expect(css).toContain(".editor-scrollport::-webkit-scrollbar-thumb");
    });
});
