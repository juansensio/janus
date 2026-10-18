import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    evaluateNavigationUrl,
    evaluateWindowOpen,
} from "./navigation-policy";

const bundleDir = path.resolve("/project/dist/ui");

describe("evaluateNavigationUrl", () => {
    it("allows file URLs under the UI bundle directory", () => {
        const index = path.join(bundleDir, "index.html");
        expect(
            evaluateNavigationUrl(`file://${index}`, { uiBundleDir: bundleDir }),
        ).toBe("allow");
    });

    it("denies file URLs outside the UI bundle directory", () => {
        expect(
            evaluateNavigationUrl("file:///etc/passwd", {
                uiBundleDir: bundleDir,
            }),
        ).toBe("deny");
    });

    it("denies localhost http when dev mode is off", () => {
        expect(
            evaluateNavigationUrl("http://localhost:5173/", {
                uiBundleDir: bundleDir,
                devMode: false,
            }),
        ).toBe("deny");
    });

    it("denies http and https navigation in production mode", () => {
        expect(
            evaluateNavigationUrl("https://example.com", {
                uiBundleDir: bundleDir,
            }),
        ).toBe("deny");
        expect(
            evaluateNavigationUrl("http://evil.test/", {
                uiBundleDir: bundleDir,
            }),
        ).toBe("deny");
    });

    it("allows localhost http in dev mode only", () => {
        expect(
            evaluateNavigationUrl("http://127.0.0.1:5173/", {
                uiBundleDir: bundleDir,
                devMode: true,
            }),
        ).toBe("allow");
        expect(
            evaluateNavigationUrl("http://127.0.0.1:5173/", {
                uiBundleDir: bundleDir,
                devMode: false,
            }),
        ).toBe("deny");
    });
});

describe("evaluateWindowOpen", () => {
    it("always denies window.open", () => {
        const index = path.join(bundleDir, "index.html");
        expect(
            evaluateWindowOpen(`file://${index}`, { uiBundleDir: bundleDir }),
        ).toBe("deny");
        expect(
            evaluateWindowOpen("https://example.com", {
                uiBundleDir: bundleDir,
            }),
        ).toBe("deny");
    });
});
