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
});
