import { describe, expect, it } from "vitest";
import { normalizeJanusSettings } from "./janus-settings";

describe("normalizeJanusSettings", () => {
    it("returns empty object for non-objects", () => {
        expect(normalizeJanusSettings(null)).toEqual({});
        expect(normalizeJanusSettings("x")).toEqual({});
    });

    it("keeps string libraryRoot and uiLocale", () => {
        expect(
            normalizeJanusSettings({
                libraryRoot: "/books",
                uiLocale: "es",
            }),
        ).toEqual({ libraryRoot: "/books", uiLocale: "es" });
    });

    it("drops non-string fields", () => {
        expect(
            normalizeJanusSettings({
                libraryRoot: 42,
                uiLocale: ["es"],
                extra: true,
            }),
        ).toEqual({});
    });
});
