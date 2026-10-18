import { createMockJanusBridge, type BookSummary } from "@janus/bridge";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountJanusShell } from "../mount";
import { initTestI18n } from "../test-i18n";

const sampleBook: BookSummary = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Draft",
    createdAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
    initTestI18n("en");
});

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
            readManuscript: async () =>
                '<janus-manuscript version="1"></janus-manuscript>',
            writeManuscript: write,
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-field")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".editor-add-comment")?.click();
        await vi.advanceTimersByTimeAsync(1000);
        expect(write).toHaveBeenCalled();
        const saved = write.mock.calls.at(-1)?.[1] as string;
        expect(saved).toContain("janus-ai-comment");
        expect(saved).not.toContain("AI instruction");
    });

    it("flushes on Shelf before returning to the shelf", async () => {
        const write = vi.fn(async () => {});
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () =>
                '<janus-manuscript version="1"><janus-p>start</janus-p></janus-manuscript>',
            writeManuscript: write,
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-field")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".editor-add-comment")?.click();
        root.querySelector<HTMLButtonElement>(".editor-back")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-wordmark")).not.toBeNull(),
        );
        expect(write).toHaveBeenCalled();
        const saved = write.mock.calls.at(-1)?.[1] as string;
        expect(saved).toContain("janus-ai-comment");
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
            readManuscript: async () =>
                '<janus-manuscript version="1"></janus-manuscript>',
            writeManuscript: write,
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-field")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".editor-add-comment")?.click();
        root.querySelector<HTMLButtonElement>(".editor-back")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-error")?.textContent).toContain(
                "Could not save",
            ),
        );
        expect(root.querySelector(".editor-field")).not.toBeNull();
    });

    it("shows inline not-connected error when Write fails", async () => {
        const root = document.createElement("main");
        document.body.append(root);
        const commentHtml =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Prompt</janus-ai-comment></janus-manuscript>';
        const writeForComment = vi.fn(async () => {
            throw Object.assign(new Error("Connect first"), {
                code: "AI_NOT_CONNECTED",
            });
        });
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () => commentHtml,
            writeForComment,
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-ai-comment-write")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".editor-ai-comment-write")?.click();
        await vi.waitFor(() => expect(writeForComment).toHaveBeenCalled());
        await vi.waitFor(() => {
            const status = root.querySelector(".editor-ai-comment-status");
            expect(status?.textContent ?? "").toContain("Connect OpenAI");
            expect(status?.classList.contains("editor-ai-comment-status-error")).toBe(
                true,
            );
        });
        const headerErrors = root.querySelectorAll(".editor-chrome .editor-error");
        for (const el of headerErrors) {
            expect(el.textContent).toBe("");
        }
    });

    it("shows draft text while writeForComment streams deltas", async () => {
        const root = document.createElement("main");
        document.body.append(root);
        const commentHtml =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Prompt</janus-ai-comment></janus-manuscript>';
        const finalHtml =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Prompt</janus-ai-comment><janus-ai-draft id="d1" comment-id="c1"><janus-p>Done</janus-p></janus-ai-draft></janus-manuscript>';
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () => commentHtml,
            writeForComment: async (_id, _commentId, _locale, options) => {
                options?.onDraftDelta?.("<janus-p>Partial</janus-p>");
                return finalHtml;
            },
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-ai-comment-write")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".editor-ai-comment-write")?.click();
        await vi.waitFor(() =>
            expect(root.textContent ?? "").toContain("Partial"),
        );
        await vi.waitFor(() =>
            expect(root.textContent ?? "").toContain("Done"),
        );
    });

    it("disables Add comment while Write is in flight", async () => {
        const root = document.createElement("main");
        document.body.append(root);
        const commentHtml =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Prompt</janus-ai-comment></janus-manuscript>';
        let resolveWrite!: () => void;
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () => commentHtml,
            writeForComment: () =>
                new Promise((resolve) => {
                    resolveWrite = () =>
                        resolve(
                            '<janus-manuscript version="1"><janus-ai-comment id="c1">Prompt</janus-ai-comment><janus-ai-draft id="d1" comment-id="c1"><janus-p>Done</janus-p></janus-ai-draft></janus-manuscript>',
                        );
                }),
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-add-comment")).not.toBeNull(),
        );
        const addBtn = root.querySelector<HTMLButtonElement>(".editor-add-comment");
        root.querySelector<HTMLButtonElement>(".editor-ai-comment-write")?.click();
        await vi.waitFor(() => expect(addBtn?.disabled).toBe(true));
        resolveWrite();
        await vi.waitFor(() => expect(addBtn?.disabled).toBe(false));
    });
});
