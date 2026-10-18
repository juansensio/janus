import { describe, expect, it } from "vitest";
import {
    buildApplicationMenuTemplate,
    buildZoomMenuItems,
} from "./zoom-menu";

describe("zoom menu", () => {
    it("includes zoom in, out, and reset entries", () => {
        const items = buildZoomMenuItems();
        const labels = items.map((item) => item.label);
        expect(labels).toEqual(["Zoom In", "Zoom Out", "Actual Size"]);
        expect(items[0]?.accelerator).toBe("CmdOrCtrl+=");
        expect(items[1]?.accelerator).toBe("CmdOrCtrl+-");
        expect(items[2]?.accelerator).toBe("CmdOrCtrl+0");
    });

    it("includes edit menu role for clipboard shortcuts", () => {
        const roles = buildApplicationMenuTemplate().map((item) => item.role);
        expect(roles).toContain("editMenu");
    });
});
