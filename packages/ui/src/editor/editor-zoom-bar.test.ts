import { createMockJanusBridge } from "@janus/bridge";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initTestI18n } from "../test-i18n";
import { t } from "../i18n";
import { createEditorZoomController } from "./editor-zoom";
import { mountEditorZoomBar } from "./editor-zoom-bar";

afterEach(() => {
    document.body.innerHTML = "";
});

beforeEach(() => {
    initTestI18n("en");
});

describe("editor-zoom-bar", () => {
    it("shows zoom label and disables minus at minimum", () => {
        const shell = document.createElement("div");
        shell.className = "janus-editor-shell";
        const host = document.createElement("div");
        host.className = "janus-editor";
        shell.append(host);
        document.body.append(shell);

        const bridge = createMockJanusBridge({
            getEditorZoom: async () => ({
                percent: 75,
                levels: [75, 100, 110],
            }),
        });
        const controller = createEditorZoomController(host, bridge, 75);
        const bar = mountEditorZoomBar(host, controller);

        const label = host.querySelector(".editor-zoom-label");
        expect(label?.textContent).toBe(
            t("manuscript.editorZoomBar", { percent: "75" }),
        );
        expect(
            host.querySelector<HTMLButtonElement>(".editor-zoom-out")?.disabled,
        ).toBe(true);
        bar.dispose();
        shell.remove();
    });

    it("zoom in button steps through controller", async () => {
        const setEditorZoom = vi.fn(async (percent: number) => ({
            percent,
            levels: [75, 100, 110],
        }));
        const shell = document.createElement("div");
        shell.className = "janus-editor-shell";
        const host = document.createElement("div");
        host.className = "janus-editor";
        shell.append(host);
        document.body.append(shell);

        const bridge = createMockJanusBridge({
            getEditorZoom: async () => ({
                percent: 100,
                levels: [75, 100, 110],
            }),
            setEditorZoom,
        });
        let syncBar: (percent: number) => void = () => {};
        const controller = createEditorZoomController(host, bridge, 100, {
            onPercentChange: (percent) => syncBar(percent),
        });
        const bar = mountEditorZoomBar(host, controller);
        syncBar = bar.sync;

        host.querySelector<HTMLButtonElement>(".editor-zoom-in")?.click();
        await vi.waitFor(() => expect(setEditorZoom).toHaveBeenCalledWith(110));
        expect(host.querySelector(".editor-zoom-label")?.textContent).toBe(
            t("manuscript.editorZoomBar", { percent: "110" }),
        );
        bar.dispose();
        shell.remove();
    });
});
