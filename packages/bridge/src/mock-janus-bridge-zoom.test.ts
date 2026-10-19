import { describe, expect, it } from "vitest";
import { createMockJanusBridge } from "./mock-janus-bridge";

describe("mock JanusBridge editor zoom", () => {
    it("defaults to 100 and persists set", async () => {
        const bridge = createMockJanusBridge();
        await expect(bridge.getEditorZoom()).resolves.toMatchObject({
            percent: 100,
        });
        await bridge.setEditorZoom(125);
        await expect(bridge.getEditorZoom()).resolves.toMatchObject({
            percent: 125,
        });
    });

    it("rejects invalid zoom", async () => {
        const bridge = createMockJanusBridge();
        await expect(bridge.setEditorZoom(80)).rejects.toMatchObject({
            code: "INVALID_EDITOR_ZOOM",
        });
    });
});
