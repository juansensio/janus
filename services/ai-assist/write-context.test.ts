import { describe, expect, it } from "vitest";
import { AiAssistError } from "./provider";
import { WRITE_CONTEXT_MARK, buildWriteContext } from "./write-context";

const manuscript = (
    inner: string,
) => `<janus-manuscript version="1">${inner}</janus-manuscript>`;

describe("buildWriteContext", () => {
    it("places WRITE mark at the target comment with surrounding paragraphs", () => {
        const html = manuscript(
            "<janus-p>Before</janus-p><janus-ai-comment id=\"c1\">continue here</janus-ai-comment><janus-p>After</janus-p>",
        );
        const prose = buildWriteContext(html, "c1");
        expect(prose).toBe(`Before\n\n${WRITE_CONTEXT_MARK}\n\nAfter`);
        expect(prose).not.toContain("continue here");
        expect(prose).not.toContain("janus-");
    });

    it("omits other comments and drafts", () => {
        const html = manuscript(
            "<janus-p>One</janus-p><janus-ai-comment id=\"other\">skip</janus-ai-comment><janus-ai-comment id=\"c1\">go</janus-ai-comment><janus-ai-draft id=\"d1\" comment-id=\"c1\"><janus-p>Draft</janus-p></janus-ai-draft><janus-p>Two</janus-p>",
        );
        const prose = buildWriteContext(html, "c1");
        expect(prose).toBe(`One\n\n${WRITE_CONTEXT_MARK}\n\nTwo`);
        expect(prose).not.toContain("skip");
        expect(prose).not.toContain("Draft");
    });

    it("throws when the comment id is missing", () => {
        const html = manuscript("<janus-p>Only</janus-p>");
        expect(() => buildWriteContext(html, "missing")).toThrow(AiAssistError);
        try {
            buildWriteContext(html, "missing");
        } catch (error) {
            expect(error).toMatchObject({ code: "AI_COMMENT_NOT_FOUND" });
        }
    });
});
