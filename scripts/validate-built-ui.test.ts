import { describe, expect, it } from "vitest";
import {
    assertBuiltIndexHtml,
    assertBuiltJsContainsShellLabel,
    assertBuiltShellHtml,
} from "./validate-built-ui";

describe("assertBuiltShellHtml", () => {
    it("passes when index uses relative asset URLs and #app", () => {
        const html = `<main id="app"></main><script type="module" src="./assets/index-abc.js"></script>`;
        expect(() => assertBuiltShellHtml(html, "index.html")).not.toThrow();
    });

    it("passes relative modulepreload href", () => {
        const html = `<main id="app"></main><link rel="modulepreload" href="./assets/bootstrap-abc.js">`;
        expect(() => assertBuiltShellHtml(html, "mobile.html")).not.toThrow();
    });

    it("fails when script src uses root-absolute /assets/", () => {
        const html = `<main id="app"></main><script type="module" src="/assets/index-abc.js"></script>`;
        expect(() => assertBuiltShellHtml(html, "index.html")).toThrow(
            /index\.html uses absolute asset URL/i,
        );
    });

    it("fails when link href uses root-absolute /assets/", () => {
        const html = `<main id="app"></main><link rel="modulepreload" href="/assets/bootstrap-abc.js">`;
        expect(() => assertBuiltShellHtml(html, "mobile.html")).toThrow(
            /mobile\.html uses absolute asset URL/i,
        );
    });

    it("fails when #app is missing", () => {
        const html = `<script type="module" src="./assets/index-abc.js"></script>`;
        expect(() => assertBuiltShellHtml(html, "index.html")).toThrow(
            /index\.html missing #app/i,
        );
    });
});

describe("assertBuiltIndexHtml", () => {
    it("delegates to shell html guard with index label", () => {
        const html = `<main id="app"></main><script type="module" src="/assets/x.js"></script>`;
        expect(() => assertBuiltIndexHtml(html)).toThrow(/built index\.html/i);
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
