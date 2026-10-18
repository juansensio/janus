import { describe, expect, it, vi } from "vitest";
import { createMockJanusBridge } from "@janus/bridge";
import {
    applyEditorPageZoom,
    attachEditorZoomShortcuts,
    EDITOR_PAGE_ZOOM_VAR,
    loadAndApplyEditorZoom,
} from "./editor-zoom";

describe("editor-zoom", () => {
    it("sets CSS variable on editor shell", () => {
        const shell = document.createElement("div");
        shell.className = "janus-editor-shell";
        applyEditorPageZoom(shell, 125);
        expect(shell.style.getPropertyValue(EDITOR_PAGE_ZOOM_VAR)).toBe("1.25");
    });

    it("loads zoom from bridge", async () => {
        const bridge = createMockJanusBridge({
            getEditorZoom: async () => ({
                percent: 150,
                levels: [100, 150],
            }),
        });
        const shell = document.createElement("div");
        shell.className = "janus-editor-shell";
        const host = document.createElement("div");
        shell.append(host);
        document.body.append(shell);
        await loadAndApplyEditorZoom(host, bridge);
        expect(shell.style.getPropertyValue(EDITOR_PAGE_ZOOM_VAR)).toBe("1.5");
        shell.remove();
    });

    it("steps zoom on keyboard shortcut", async () => {
        const setEditorZoom = vi.fn(async (percent: number) => ({
            percent,
            levels: [75, 100, 110],
        }));
        const bridge = createMockJanusBridge({
            getEditorZoom: async () => ({ percent: 100, levels: [75, 100, 110] }),
            setEditorZoom,
        });
        const shell = document.createElement("div");
        shell.className = "janus-editor-shell";
        const host = document.createElement("div");
        shell.append(host);
        document.body.append(shell);
        let current = 100;
        const detach = attachEditorZoomShortcuts(bridge, host, {
            getCurrentPercent: () => current,
            setCurrentPercent: (p) => {
                current = p;
            },
            isActive: () => true,
        });
        document.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "=",
                ctrlKey: true,
                bubbles: true,
            }),
        );
        await vi.waitFor(() => expect(setEditorZoom).toHaveBeenCalledWith(110));
        detach();
        shell.remove();
    });
});
