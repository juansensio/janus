import { describe, expect, it } from "vitest";
import { resolveDesktopUiLoadTarget } from "./ui-load-url";

describe("resolveDesktopUiLoadTarget", () => {
    it("returns dev URL when dev mode is enabled", () => {
        expect(
            resolveDesktopUiLoadTarget({
                devMode: true,
                devPort: 5173,
                indexHtmlPath: "/tmp/index.html",
            }),
        ).toEqual({ kind: "url", url: "http://127.0.0.1:5173/" });
    });

    it("returns file path in production mode", () => {
        expect(
            resolveDesktopUiLoadTarget({
                devMode: false,
                indexHtmlPath: "/tmp/dist/ui/index.html",
            }),
        ).toEqual({ kind: "file", path: "/tmp/dist/ui/index.html" });
    });
});
