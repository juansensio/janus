import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const shelfCssPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "shelf.css",
);

describe("shelf.css", () => {
    it("defines at least eight cover palette modifier classes", () => {
        const css = readFileSync(shelfCssPath, "utf8");
        const modifiers = ["a", "b", "c", "d", "e", "f", "g", "h"];
        for (const letter of modifiers) {
            expect(css).toContain(`.shelf-cover--${letter}`);
        }
    });

    it("uses rem for card width token", () => {
        const css = readFileSync(shelfCssPath, "utf8");
        expect(css).toMatch(/--shelf-card-width:\s*[\d.]+rem/);
    });

    it("wraps shelf track instead of horizontal scroll", () => {
        const css = readFileSync(shelfCssPath, "utf8");
        const trackBlock = css.match(/\.shelf-track\s*\{[^}]+\}/)?.[0] ?? "";
        expect(trackBlock).toContain("flex-wrap: wrap");
        expect(trackBlock).not.toContain("flex-wrap: nowrap");
        expect(trackBlock).not.toContain("overflow-x: auto");
    });

    it("allows cards and add tile to shrink on narrow viewports", () => {
        const css = readFileSync(shelfCssPath, "utf8");
        expect(css).toMatch(
            /\.shelf-card\s*\{[^}]*flex:\s*0\s+1\s+var\(--shelf-card-width\)/,
        );
        expect(css).toMatch(/\.shelf-card\s*\{[^}]*max-width:\s*100%/);
        expect(css).toMatch(
            /\.shelf-add\s*\{[^}]*flex:\s*0\s+1\s+var\(--shelf-card-width\)/,
        );
        expect(css).toMatch(/\.shelf-add\s*\{[^}]*max-width:\s*100%/);
    });
});
