import { describe, expect, it } from "vitest";
import { manuscriptSchema } from "./manuscript-schema";
import { parseManuscriptHtml, serializeManuscriptHtml } from "./manuscript-html";

describe("manuscript-html (UI)", () => {
    it("serializes janus-p paragraphs", () => {
        const doc = manuscriptSchema.node("doc", null, [
            manuscriptSchema.node("janus_p", null, [
                manuscriptSchema.text("Hello"),
            ]),
        ]);
        expect(serializeManuscriptHtml(doc)).toBe(
            '<janus-manuscript version="1"><janus-p>Hello</janus-p></janus-manuscript>',
        );
    });

    it("round-trips janus-ai-comment", () => {
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment></janus-manuscript>';
        const doc = parseManuscriptHtml(html);
        expect(serializeManuscriptHtml(doc)).toBe(html);
    });
});
