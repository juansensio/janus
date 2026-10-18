import { createMockJanusBridge } from "@janus/bridge";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountJanusShell } from "../mount";
import { renderSettings } from "./render-settings";

afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

describe("renderSettings", () => {
    it("shows library path from getLibraryRoot", async () => {
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            getLibraryRoot: async () => ({
                path: "/data/custom-library",
                source: "settings",
            }),
        });
        await renderSettings(host, bridge, { onBack: () => {} });
        expect(host.textContent).toContain("/data/custom-library");
        expect(host.textContent).toContain("Custom folder");
    });

    it("opens settings from shelf on desktop", async () => {
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [],
            getLibraryRoot: async () => ({
                path: "/data/library",
                source: "user-data",
            }),
        });
        mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-settings")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-settings")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".settings-path")?.textContent).toBe(
                "/data/library",
            ),
        );
    });
});
