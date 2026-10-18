import { describe, expect, it } from "vitest";
import {
    assertBuiltIndexHtml,
    assertBuiltJsContainsShellLabel,
} from "./validate-built-ui";

describe("assertBuiltIndexHtml", () => {
    it("passes when index uses relative asset URLs and #app", () => {
        const html = `<main id="app"></main><script type="module" src="./assets/index-abc.js"></script>`;
        expect(() => assertBuiltIndexHtml(html)).not.toThrow();
    });

    it("fails when script src uses root-absolute /assets/", () => {
        const html = `<main id="app"></main><script type="module" src="/assets/index-abc.js"></script>`;
        expect(() => assertBuiltIndexHtml(html)).toThrow(
            /absolute asset URL/i,
        );
    });

    it("fails when #app is missing", () => {
        const html = `<script type="module" src="./assets/index-abc.js"></script>`;
        expect(() => assertBuiltIndexHtml(html)).toThrow(/missing #app/i);
    });
});

describe("assertBuiltJsContainsShellLabel", () => {
    it("passes when bundle text includes Janus shell label", () => {
        expect(() =>
            assertBuiltJsContainsShellLabel('const label = "Janus";'),
        ).not.toThrow();
    });

    it("fails when bundle does not include Janus", () => {
        expect(() => assertBuiltJsContainsShellLabel("export {}")).toThrow(
            /shell label/i,
        );
    });
});
