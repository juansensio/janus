import { describe, expect, it } from "vitest";
import { beginHighlightRewrite } from "./highlight-rewrite";
import {
    deleteAiComment,
    parseManuscriptBlocks,
    rejectAiDraft,
} from "./index";
import { insertOrReplaceDraft } from "./manuscript-transforms";
import { ManuscriptServiceError } from "./manuscript-service";

describe("beginHighlightRewrite", () => {
    const html =
        '<janus-manuscript version="1"><janus-p>Hello world</janus-p><janus-p>Second para</janus-p></janus-manuscript>';

    it("splits a paragraph and inserts a rewrite comment", () => {
        const next = beginHighlightRewrite(html, {
            commentId: "c1",
            instruction: "Make it vivid",
            spans: [{ blockIndex: 0, start: 6, end: 11 }],
        });
        const blocks = parseManuscriptBlocks(next);
        expect(blocks.map((b) => b.kind)).toEqual(["p", "comment", "p"]);
        expect(blocks[1]).toMatchObject({
            kind: "comment",
            variant: "rewrite",
            source: "world",
            text: "Make it vivid",
        });
        expect(blocks[0]).toMatchObject({ kind: "p", text: "Hello " });
        expect(blocks[2]).toMatchObject({ kind: "p", text: "Second para" });
    });

    it("replaces multiple full paragraphs", () => {
        const next = beginHighlightRewrite(html, {
            commentId: "c2",
            instruction: "Tighten",
            spans: [
                { blockIndex: 0, start: 0, end: 11 },
                { blockIndex: 1, start: 0, end: 11 },
            ],
        });
        const blocks = parseManuscriptBlocks(next);
        expect(blocks.map((b) => b.kind)).toEqual(["comment"]);
        expect(blocks[0]).toMatchObject({
            kind: "comment",
            source: "Hello world\n\nSecond para",
        });
    });

    it("rejects empty selection", () => {
        expect(() =>
            beginHighlightRewrite(html, {
                commentId: "c3",
                instruction: "Go",
                spans: [{ blockIndex: 0, start: 0, end: 0 }],
            }),
        ).toThrow(ManuscriptServiceError);
    });
});

describe("rewrite restore", () => {
    it("restores source when rejecting a rewrite draft", () => {
        const html = beginHighlightRewrite(
            '<janus-manuscript version="1"><janus-p>Hello world</janus-p></janus-manuscript>',
            {
                commentId: "c1",
                instruction: "Rewrite",
                spans: [{ blockIndex: 0, start: 0, end: 11 }],
            },
        );
        const withDraft = insertOrReplaceDraft(
            html,
            "c1",
            "<janus-p>New text</janus-p>",
            "d1",
        );
        const restored = rejectAiDraft(withDraft, "d1");
        expect(parseManuscriptBlocks(restored)).toEqual([
            { kind: "p", text: "Hello world" },
        ]);
    });

    it("restores source when deleting rewrite comment", () => {
        const html = beginHighlightRewrite(
            '<janus-manuscript version="1"><janus-p>Hello world</janus-p></janus-manuscript>',
            {
                commentId: "c1",
                instruction: "Rewrite",
                spans: [{ blockIndex: 0, start: 6, end: 11 }],
            },
        );
        const restored = deleteAiComment(html, "c1");
        expect(parseManuscriptBlocks(restored)).toEqual([
            { kind: "p", text: "Hello world" },
        ]);
    });
});
