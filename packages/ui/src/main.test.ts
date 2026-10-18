import { afterEach, describe, expect, it } from "vitest";
import type { JanusBridge } from "@janus/bridge";
import { startShell } from "./bootstrap";

const originalUserAgent = navigator.userAgent;

afterEach(() => {
    delete (window as { janus?: JanusBridge }).janus;
    document.body.innerHTML = "";
    Object.defineProperty(navigator, "userAgent", {
        value: originalUserAgent,
        configurable: true,
    });
});

describe("shell entry (main bootstrap)", () => {
    it("mounts Janus when window.janus and #app exist", async () => {
        window.janus = { platform: () => "desktop" };
        const root = document.createElement("main");
        root.id = "app";
        document.body.append(root);

        await startShell();

        expect(root.querySelector("h1")?.textContent).toBe("Janus");
        expect(root.dataset.platform).toBe("desktop");
    });

    it("throws Missing #app when root element is absent", async () => {
        window.janus = { platform: () => "desktop" };
        await expect(startShell()).rejects.toThrow("Missing #app");
    });
});
