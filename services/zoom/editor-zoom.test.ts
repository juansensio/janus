import { describe, expect, it } from "vitest";
import {
    assertEditorZoomPercent,
    EDITOR_ZOOM_DEFAULT,
    normalizeEditorZoomPercent,
    resetEditorZoom,
    stepEditorZoom,
} from "./editor-zoom";

describe("editor-zoom", () => {
    it("normalizes valid levels", () => {
        expect(normalizeEditorZoomPercent(125)).toBe(125);
    });

    it("falls back to default for invalid values", () => {
        expect(normalizeEditorZoomPercent(99)).toBe(EDITOR_ZOOM_DEFAULT);
        expect(normalizeEditorZoomPercent("100")).toBe(EDITOR_ZOOM_DEFAULT);
    });

    it("steps in and out within bounds", () => {
        expect(stepEditorZoom(100, "in")).toBe(110);
        expect(stepEditorZoom(100, "out")).toBe(90);
        expect(stepEditorZoom(75, "out")).toBe(75);
        expect(stepEditorZoom(200, "in")).toBe(200);
    });

    it("resets to default", () => {
        expect(resetEditorZoom()).toBe(100);
    });

    it("assert rejects invalid percent", () => {
        expect(() => assertEditorZoomPercent(80)).toThrowError(
            /Invalid editor zoom/,
        );
    });
});
