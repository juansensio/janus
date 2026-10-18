import { describe, expect, it } from "vitest";
import { loadJanusSettings, resolveLibraryRoot } from "./library-root";

describe("loadJanusSettings", () => {
    it("ignores non-string libraryRoot and uiLocale", async () => {
        const settings = await loadJanusSettings("/user", {
            readFile: async () =>
                JSON.stringify({ libraryRoot: 42, uiLocale: ["es"] }),
        });
        expect(settings).toEqual({});
    });
});

describe("resolveLibraryRoot with normalized settings", () => {
    it("does not throw when libraryRoot was coerced away", () => {
        expect(
            resolveLibraryRoot({
                env: {},
                repoRoot: "/repo",
                userDataPath: "/user",
                settings: {},
                isDev: false,
            }).path,
        ).toContain("/user/library");
    });
});
