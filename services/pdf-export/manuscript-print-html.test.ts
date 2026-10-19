import { describe, expect, it } from "vitest";
import { createEmptyManuscriptHtml } from "@janus/manuscript";
import {
    buildManuscriptPrintHtml,
    collectPrintParagraphs,
} from "./manuscript-print-html";
import { parseManuscriptBlocks } from "@janus/manuscript";

const sampleHtml =
    '<janus-manuscript version="1"><janus-p>Line one</janus-p><janus-ai-comment id="c1">Note</janus-ai-comment><janus-ai-draft id="d1" comment-id="c1"><janus-p>Draft</janus-p></janus-ai-draft><janus-p>Line two</janus-p></janus-manuscript>';

describe("collectPrintParagraphs", () => {
    it("keeps only janus-p blocks", () => {
        const blocks = parseManuscriptBlocks(sampleHtml);
        expect(collectPrintParagraphs(blocks)).toEqual([
            "Line one",
            "Line two",
        ]);
    });
});

describe("buildManuscriptPrintHtml", () => {
    it("renders title and escaped paragraphs", () => {
        const html = buildManuscriptPrintHtml({
            title: 'My <Book>',
            manuscriptHtml: sampleHtml,
        });
        expect(html).toContain("<h1>My &lt;Book&gt;</h1>");
        expect(html).toContain("<p>Line one</p>");
        expect(html).toContain("<p>Line two</p>");
        expect(html).toContain("@page { size: A4;");
        expect(html).not.toContain("janus-ai");
        expect(html).not.toContain("Draft");
        expect(html).not.toContain("Note");
    });

    it("renders title only for empty manuscript", () => {
        const html = buildManuscriptPrintHtml({
            title: "Empty Book",
            manuscriptHtml: createEmptyManuscriptHtml(),
        });
        expect(html).toContain("<h1>Empty Book</h1>");
        expect(html).not.toContain("<p>");
    });
});
