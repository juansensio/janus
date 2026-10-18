import { beforeEach, describe, expect, it, vi } from "vitest";

const readFile = vi.fn();
const writeFile = vi.fn();

vi.mock("@capacitor/filesystem", () => ({
    Directory: { Data: "DATA" },
    Encoding: { UTF8: "utf8" },
    Filesystem: {
        readFile: (...args: unknown[]) => readFile(...args),
        writeFile: (...args: unknown[]) => writeFile(...args),
    },
}));

import { loadJanusSettings, saveJanusSettings } from "./janus-settings";

beforeEach(() => {
    readFile.mockReset();
    writeFile.mockReset();
});

describe("janus-settings", () => {
    it("loads persisted settings", async () => {
        readFile.mockResolvedValue({
            data: JSON.stringify({ uiLocale: "es" }),
        });
        await expect(loadJanusSettings()).resolves.toEqual({ uiLocale: "es" });
    });

    it("returns empty object when file is missing", async () => {
        readFile.mockRejectedValue(new Error("missing"));
        await expect(loadJanusSettings()).resolves.toEqual({});
    });

    it("ignores non-string fields when loading", async () => {
        readFile.mockResolvedValueOnce({
            data: JSON.stringify({ libraryRoot: false, uiLocale: 1 }),
        });
        await expect(loadJanusSettings()).resolves.toEqual({});
    });

    it("merges editorZoomPercent on save without dropping uiLocale", async () => {
        readFile.mockResolvedValue({
            data: JSON.stringify({ uiLocale: "es" }),
        });
        await saveJanusSettings({ uiLocale: "es", editorZoomPercent: 125 });
        const payload = JSON.parse(
            String(writeFile.mock.calls[0]?.[0]?.data),
        ) as { uiLocale?: string; editorZoomPercent?: number };
        expect(payload.uiLocale).toBe("es");
        expect(payload.editorZoomPercent).toBe(125);
    });

    it("merges uiLocale on save without dropping libraryRoot", async () => {
        readFile.mockResolvedValue({
            data: JSON.stringify({ libraryRoot: "/custom" }),
        });
        await saveJanusSettings({ libraryRoot: "/custom", uiLocale: "es" });
        expect(writeFile).toHaveBeenCalled();
        const payload = JSON.parse(
            String(writeFile.mock.calls[0]?.[0]?.data),
        ) as { libraryRoot?: string; uiLocale?: string };
        expect(payload.libraryRoot).toBe("/custom");
        expect(payload.uiLocale).toBe("es");
    });
});
