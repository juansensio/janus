import { describe, expect, it } from "vitest";
import type { JanusBridge } from "@janus/bridge";
import { mountJanusShell } from "./mount";

function mockBridge(platform: "desktop" | "mobile"): JanusBridge {
    return { platform: () => platform };
}

describe("mountJanusShell", () => {
    it("renders Janus heading and desktop platform", () => {
        const root = document.createElement("main");
        mountJanusShell(root, mockBridge("desktop"));
        expect(root.querySelector("h1")?.textContent).toBe("Janus");
        expect(root.dataset.platform).toBe("desktop");
    });

    it("sets mobile platform", () => {
        const root = document.createElement("main");
        mountJanusShell(root, mockBridge("mobile"));
        expect(root.dataset.platform).toBe("mobile");
    });
});
