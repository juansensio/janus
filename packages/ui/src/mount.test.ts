import { createMockJanusBridge } from "@janus/bridge";
import { describe, expect, it } from "vitest";
import { mountJanusShell } from "./mount";

function mockBridge(platform: "desktop" | "mobile") {
    return createMockJanusBridge({ platform: () => platform });
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

    it("replaces prior children on second mount", () => {
        const root = document.createElement("main");
        mountJanusShell(root, mockBridge("desktop"));
        const firstHeading = root.querySelector("h1");
        mountJanusShell(root, mockBridge("mobile"));
        expect(root.querySelectorAll("h1")).toHaveLength(1);
        expect(root.querySelector("h1")).not.toBe(firstHeading);
        expect(root.dataset.platform).toBe("mobile");
    });
});
