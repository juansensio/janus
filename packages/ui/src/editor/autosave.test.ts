import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutosaveController } from "./autosave";

afterEach(() => {
    vi.useRealTimers();
});

describe("createAutosaveController", () => {
    it("does not save when text matches last loaded value", async () => {
        const save = vi.fn(async () => {});
        const controller = createAutosaveController({
            intervalMs: 1000,
            getText: () => "same",
            save,
            onStatus: () => {},
        });
        controller.markLoaded("same");
        controller.onInput("same");
        vi.useFakeTimers();
        vi.advanceTimersByTime(2000);
        expect(save).not.toHaveBeenCalled();
        controller.dispose();
    });

    it("saves at most once per interval while dirty", async () => {
        const save = vi.fn(async () => {});
        let text = "a";
        const controller = createAutosaveController({
            intervalMs: 1000,
            getText: () => text,
            save,
            onStatus: () => {},
        });
        vi.useFakeTimers();
        controller.markLoaded("");
        controller.onInput("a");
        await vi.advanceTimersByTimeAsync(1000);
        expect(save).toHaveBeenCalledTimes(1);
        expect(save).toHaveBeenCalledWith("a");
        text = "ab";
        controller.onInput("ab");
        await vi.advanceTimersByTimeAsync(1000);
        expect(save).toHaveBeenCalledTimes(2);
        controller.dispose();
    });

    it("flush writes immediately", async () => {
        const save = vi.fn(async () => {});
        const controller = createAutosaveController({
            intervalMs: 1000,
            getText: () => "draft",
            save,
            onStatus: () => {},
        });
        controller.markLoaded("");
        controller.onInput("draft");
        await controller.flush();
        expect(save).toHaveBeenCalledWith("draft");
        expect(controller.isDirty()).toBe(false);
        controller.dispose();
    });
});
