import { createMockJanusBridge, type BookSummary } from "@janus/bridge";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountJanusShell } from "../mount";

const sampleBook: BookSummary = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Draft",
    createdAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("editor autosave flow", () => {
    it("writes changed text after the autosave interval", async () => {
        vi.useFakeTimers();
        const write = vi.fn(async () => {});
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () => "",
            writeManuscript: write,
        });
        mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-field")).not.toBeNull(),
        );
        const field = root.querySelector("textarea")!;
        field.value = "New words";
        field.dispatchEvent(new Event("input", { bubbles: true }));
        await vi.advanceTimersByTimeAsync(1000);
        expect(write).toHaveBeenCalledWith(sampleBook.id, "New words");
    });

    it("flushes on Shelf before returning to the shelf", async () => {
        const write = vi.fn(async () => {});
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () => "start",
            writeManuscript: write,
        });
        mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-field")).not.toBeNull(),
        );
        const field = root.querySelector("textarea")!;
        field.value = "start plus";
        field.dispatchEvent(new Event("input", { bubbles: true }));
        root.querySelector<HTMLButtonElement>(".editor-back")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-wordmark")).not.toBeNull(),
        );
        expect(write).toHaveBeenCalledWith(sampleBook.id, "start plus");
    });

    it("stays on editor when flush fails", async () => {
        const write = vi.fn(async () => {
            throw Object.assign(new Error("fail"), {
                code: "MANUSCRIPT_WRITE_FAILED",
            });
        });
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () => "",
            writeManuscript: write,
        });
        mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-field")).not.toBeNull(),
        );
        const field = root.querySelector("textarea")!;
        field.value = "oops";
        field.dispatchEvent(new Event("input", { bubbles: true }));
        root.querySelector<HTMLButtonElement>(".editor-back")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-error")?.textContent).toContain(
                "Could not save",
            ),
        );
        expect(root.querySelector(".editor-field")).not.toBeNull();
    });
});
