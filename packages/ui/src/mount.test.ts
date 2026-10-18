import { createMockJanusBridge } from "@janus/bridge";
import { describe, expect, it, vi } from "vitest";
import { mountJanusShell } from "./mount";

function mockBridge(platform: "desktop" | "mobile") {
    return createMockJanusBridge({ platform: () => platform });
}

describe("mountJanusShell", () => {
    it("renders Janus wordmark inside shelf chrome", async () => {
        const root = document.createElement("main");
        mountJanusShell(root, mockBridge("desktop"));
        expect(root.querySelector(":scope > h1")).toBeNull();
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-wordmark")?.textContent).toBe(
                "Janus",
            ),
        );
        expect(root.dataset.platform).toBe("desktop");
    });

    it("sets mobile platform", async () => {
        const root = document.createElement("main");
        mountJanusShell(root, mockBridge("mobile"));
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-wordmark")).not.toBeNull(),
        );
        expect(root.dataset.platform).toBe("mobile");
    });

    it("replaces prior children on second mount", async () => {
        const root = document.createElement("main");
        mountJanusShell(root, mockBridge("desktop"));
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-wordmark")).not.toBeNull(),
        );
        const firstWordmark = root.querySelector(".shelf-wordmark");
        mountJanusShell(root, mockBridge("mobile"));
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-wordmark")).not.toBe(
                firstWordmark,
            ),
        );
        expect(root.querySelectorAll(".shelf-wordmark")).toHaveLength(1);
        expect(root.dataset.platform).toBe("mobile");
    });

    it("applies dark shelf shell class on root", () => {
        const root = document.createElement("main");
        mountJanusShell(root, mockBridge("desktop"));
        expect(root.classList.contains("janus-shelf-shell")).toBe(true);
    });
});
