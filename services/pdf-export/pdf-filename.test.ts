import { describe, expect, it } from "vitest";
import { suggestedPdfFilename } from "./pdf-filename";

describe("suggestedPdfFilename", () => {
    it("uses title with pdf extension", () => {
        expect(suggestedPdfFilename("My Novel")).toBe("My Novel.pdf");
    });

    it("strips path separators and control chars", () => {
        expect(suggestedPdfFilename("foo/bar:baz")).toBe("foobarbaz.pdf");
        expect(suggestedPdfFilename("a\u0001b")).toBe("ab.pdf");
    });

    it("falls back to Untitled", () => {
        expect(suggestedPdfFilename("   ")).toBe("Untitled.pdf");
    });
});
