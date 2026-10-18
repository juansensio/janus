import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initTestI18n } from "../test-i18n";
import { createManuscriptEditor } from "./manuscript-editor";

beforeEach(() => {
    initTestI18n("en");
});

afterEach(() => {
    document.body.innerHTML = "";
});

const idleFlight = () => ({ inFlight: false, commentId: null as string | null });

describe("manuscript editor AI comments", () => {
    it("removes an existing comment and its draft when Delete is clicked", () => {
        const mount = document.createElement("div");
        document.body.append(mount);
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Keep typing</janus-ai-comment><janus-ai-draft id="d1" comment-id="c1"><janus-p>Draft</janus-p></janus-ai-draft></janus-manuscript>';
        const onDocChange = vi.fn();
        const editor = createManuscriptEditor(mount, html, {
            lang: "en",
            showAiChrome: true,
            getWriteFlight: idleFlight,
            openAiModelOptions: ["auto", "gpt-4o"],
            onDocChange,
            onWriteComment: async () => {},
            onAcceptDraft: async () => {},
            onRejectDraft: async () => {},
            onTransformError: () => {},
        });
        mount
            .querySelector<HTMLButtonElement>(".editor-ai-comment-delete")
            ?.click();
        expect(editor.getHtml()).toBe(
            '<janus-manuscript version="1"><janus-p></janus-p></janus-manuscript>',
        );
        expect(onDocChange).toHaveBeenCalled();
        editor.destroy();
    });

    it("shows Write and Delete on a loaded AI comment", () => {
        const mount = document.createElement("div");
        document.body.append(mount);
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Prompt text</janus-ai-comment></janus-manuscript>';
        const editor = createManuscriptEditor(mount, html, {
            lang: "en",
            showAiChrome: true,
            getWriteFlight: idleFlight,
            openAiModelOptions: ["auto", "gpt-4o"],
            onDocChange: () => {},
            onWriteComment: async () => {},
            onAcceptDraft: async () => {},
            onRejectDraft: async () => {},
            onTransformError: () => {},
        });
        expect(
            mount.querySelector(".editor-ai-comment-write"),
        ).not.toBeNull();
        expect(
            mount.querySelector(".editor-ai-comment-delete"),
        ).not.toBeNull();
        editor.destroy();
    });

    it("inserts a new comment without placeholder text", () => {
        const mount = document.createElement("div");
        document.body.append(mount);
        const editor = createManuscriptEditor(mount, '<janus-manuscript version="1"></janus-manuscript>', {
            lang: "en",
            showAiChrome: true,
            getWriteFlight: idleFlight,
            openAiModelOptions: ["auto", "gpt-4o"],
            onDocChange: () => {},
            onWriteComment: async () => {},
            onAcceptDraft: async () => {},
            onRejectDraft: async () => {},
            onTransformError: () => {},
        });
        editor.insertAiComment();
        const saved = editor.getHtml();
        expect(saved).toContain("janus-ai-comment");
        expect(saved).not.toContain("AI instruction");
        editor.destroy();
    });

    it("disables Write and Delete while onWriteComment is pending", async () => {
        const mount = document.createElement("div");
        document.body.append(mount);
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment></janus-manuscript>';
        const writeFlight = { inFlight: false, commentId: null as string | null };
        let finishWrite!: () => void;
        const editor = createManuscriptEditor(mount, html, {
            lang: "en",
            showAiChrome: true,
            getWriteFlight: () => writeFlight,
            openAiModelOptions: ["auto", "gpt-4o"],
            onDocChange: () => {},
            onWriteComment: () =>
                new Promise<void>((resolve) => {
                    writeFlight.inFlight = true;
                    writeFlight.commentId = "c1";
                    editor.refreshAiCommentChrome();
                    finishWrite = () => {
                        writeFlight.inFlight = false;
                        writeFlight.commentId = null;
                        editor.refreshAiCommentChrome();
                        resolve();
                    };
                }),
            onAcceptDraft: async () => {},
            onRejectDraft: async () => {},
            onTransformError: () => {},
        });
        const writeBtn = mount.querySelector<HTMLButtonElement>(
            ".editor-ai-comment-write",
        );
        const deleteBtn = mount.querySelector<HTMLButtonElement>(
            ".editor-ai-comment-delete",
        );
        writeBtn?.click();
        await vi.waitFor(() => expect(writeBtn?.disabled).toBe(true));
        expect(deleteBtn?.disabled).toBe(true);
        expect(mount.querySelector(".editor-ai-comment-status")?.textContent).toContain(
            "Writing",
        );
        finishWrite();
        await vi.waitFor(() => expect(writeBtn?.disabled).toBe(false));
        editor.destroy();
    });

    it("persists per-comment model on the comment element", () => {
        const mount = document.createElement("div");
        document.body.append(mount);
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment></janus-manuscript>';
        const editor = createManuscriptEditor(mount, html, {
            lang: "en",
            showAiChrome: true,
            getWriteFlight: idleFlight,
            openAiModelOptions: ["auto", "gpt-4o"],
            onDocChange: () => {},
            onWriteComment: async () => {},
            onAcceptDraft: async () => {},
            onRejectDraft: async () => {},
            onTransformError: () => {},
        });
        const select = mount.querySelector(
            ".editor-ai-comment-model",
        ) as HTMLSelectElement;
        select.value = "gpt-4o";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        expect(editor.getHtml()).toContain('model="gpt-4o"');
        editor.destroy();
    });

    it("applyStreamingDraft inserts draft content for the comment", () => {
        const mount = document.createElement("div");
        document.body.append(mount);
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment></janus-manuscript>';
        const editor = createManuscriptEditor(mount, html, {
            lang: "en",
            showAiChrome: true,
            getWriteFlight: idleFlight,
            openAiModelOptions: ["auto", "gpt-4o"],
            onDocChange: () => {},
            onWriteComment: async () => {},
            onAcceptDraft: async () => {},
            onRejectDraft: async () => {},
            onTransformError: () => {},
        });
        editor.applyStreamingDraft(
            "c1",
            "d-stream",
            "<janus-p>Streaming</janus-p>",
        );
        expect(editor.getHtml()).toContain('comment-id="c1"');
        expect(editor.getHtml()).toContain("Streaming");
        editor.destroy();
    });

    it("shows inline error when Write fails", async () => {
        const mount = document.createElement("div");
        document.body.append(mount);
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment></janus-manuscript>';
        const onWriteComment = vi.fn(async () => {
            throw Object.assign(new Error("no session"), {
                code: "AI_NOT_CONNECTED",
            });
        });
        const editor = createManuscriptEditor(mount, html, {
            lang: "en",
            showAiChrome: true,
            getWriteFlight: idleFlight,
            openAiModelOptions: ["auto", "gpt-4o"],
            onDocChange: () => {},
            onWriteComment,
            onAcceptDraft: async () => {},
            onRejectDraft: async () => {},
            onTransformError: () => {},
        });
        mount.querySelector<HTMLButtonElement>(".editor-ai-comment-write")?.click();
        await vi.waitFor(() => expect(onWriteComment).toHaveBeenCalled());
        await vi.waitFor(() => {
            const status = mount.querySelector(".editor-ai-comment-status");
            expect(status?.textContent ?? "").toContain("Connect OpenAI");
        });
        editor.destroy();
    });
});
