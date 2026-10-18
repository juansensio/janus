import { describe, expect, it } from "vitest";
import { buildZoomMenuItems } from "./zoom-menu";

describe("zoom menu", () => {
    it("includes zoom in, out, and reset entries", () => {
        const items = buildZoomMenuItems();
        const labels = items.map((item) => item.label);
        expect(labels).toEqual(["Zoom In", "Zoom Out", "Actual Size"]);
        expect(items[0]?.accelerator).toBe("CmdOrCtrl+=");
    });
});
