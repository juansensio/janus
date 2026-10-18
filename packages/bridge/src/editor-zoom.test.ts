import { describe, expect, it } from "vitest";
import { buildEditorZoomResult } from "./editor-zoom";

describe("buildEditorZoomResult", () => {
    it("defaults to 100 percent with full level list", () => {
        const result = buildEditorZoomResult();
        expect(result.percent).toBe(100);
        expect(result.levels).toContain(125);
    });

    it("normalizes invalid saved values", () => {
        expect(buildEditorZoomResult(80).percent).toBe(100);
        expect(buildEditorZoomResult(150).percent).toBe(150);
    });
});
