import { describe, expect, it } from "vitest";
import { ManuscriptServiceError } from "./manuscript-service";
import {
    acceptAiDraft,
    insertOrReplaceDraft,
    rejectAiDraft,
} from "./manuscript-transforms";

const base =
    '<janus-manuscript version="1"><janus-p>Before</janus-p><janus-ai-comment id="comment-1">Write here</janus-ai-comment><janus-ai-draft id="draft-1" comment-id="comment-1"><janus-p>Draft line</janus-p></janus-ai-draft><janus-p>After</janus-p></janus-manuscript>';

describe("acceptAiDraft", () => {
    it("unwraps draft into janus-p and removes comment", () => {
        expect(acceptAiDraft(base, "draft-1")).toBe(
            '<janus-manuscript version="1"><janus-p>Before</janus-p><janus-p>Draft line</janus-p><janus-p>After</janus-p></janus-manuscript>',
        );
    });

    it("throws when draft is missing", () => {
        try {
            acceptAiDraft(base, "missing");
        } catch (error) {
            expect(error).toMatchObject({ code: "MANUSCRIPT_DRAFT_NOT_FOUND" });
            return;
        }
        throw new Error("expected throw");
    });
});

describe("rejectAiDraft", () => {
    it("removes draft and keeps comment", () => {
        expect(rejectAiDraft(base, "draft-1")).toBe(
            '<janus-manuscript version="1"><janus-p>Before</janus-p><janus-ai-comment id="comment-1">Write here</janus-ai-comment><janus-p>After</janus-p></janus-manuscript>',
        );
    });

    it("is a no-op when draft is missing", () => {
        expect(rejectAiDraft(base, "missing")).toBe(base);
    });
});

describe("insertOrReplaceDraft", () => {
    it("inserts draft after comment", () => {
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="comment-1">Go</janus-ai-comment></janus-manuscript>';
        const result = insertOrReplaceDraft(
            html,
            "comment-1",
            "<janus-p>First draft</janus-p>",
            "draft-new",
        );
        expect(result).toBe(
            '<janus-manuscript version="1"><janus-ai-comment id="comment-1">Go</janus-ai-comment><janus-ai-draft id="draft-new" comment-id="comment-1"><janus-p>First draft</janus-p></janus-ai-draft></janus-manuscript>',
        );
    });

    it("replaces existing draft for the same comment", () => {
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="comment-1">Go</janus-ai-comment><janus-ai-draft id="draft-1" comment-id="comment-1"><janus-p>Old</janus-p></janus-ai-draft></janus-manuscript>';
        const result = insertOrReplaceDraft(
            html,
            "comment-1",
            "<janus-p>New</janus-p>",
            "draft-1",
        );
        expect(result).toBe(
            '<janus-manuscript version="1"><janus-ai-comment id="comment-1">Go</janus-ai-comment><janus-ai-draft id="draft-1" comment-id="comment-1"><janus-p>New</janus-p></janus-ai-draft></janus-manuscript>',
        );
    });

    it("throws when comment is missing", () => {
        try {
            insertOrReplaceDraft(base, "missing", "<janus-p>x</janus-p>", "d");
        } catch (error) {
            expect(error).toMatchObject({
                code: "MANUSCRIPT_COMMENT_NOT_FOUND",
            });
            return;
        }
        throw new Error("expected throw");
    });
});

describe("transform errors", () => {
    it("maps invalid html to MANUSCRIPT_INVALID", () => {
        expect(() => acceptAiDraft("<div></div>", "draft-1")).toThrow(
            ManuscriptServiceError,
        );
    });
});
