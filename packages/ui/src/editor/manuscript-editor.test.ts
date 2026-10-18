import { buildUiLanguageForCode } from "@janus/bridge";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initI18n } from "../i18n";
import { createManuscriptEditor } from "./manuscript-editor";

beforeEach(() => {
    initI18n(buildUiLanguageForCode("en"));
});

afterEach(() => {
    document.body.innerHTML = "";
});

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
            onDocChange,
            onWriteComment: async () => {},
            onAcceptDraft: async () => {},
            onRejectDraft: async () => {},
            onTransformError: () => {},
        });
        mount
            .querySelector<HTMLButtonElement>(".editor-ai-comment-delete")
            ?.click();
        const saved = editor.getHtml();
        expect(saved).not.toContain("janus-ai-comment");
        expect(saved).not.toContain("janus-ai-draft");
        expect(onDocChange).toHaveBeenCalled();
        editor.destroy();
    });

    it("inserts a new comment without placeholder text", () => {
        const mount = document.createElement("div");
        document.body.append(mount);
        const editor = createManuscriptEditor(mount, '<janus-manuscript version="1"></janus-manuscript>', {
            lang: "en",
            showAiChrome: true,
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
});
