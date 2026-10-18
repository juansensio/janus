import { describe, expect, it } from "vitest";
import { MANUSCRIPT_FILENAME } from "./manuscript-service";
import {
    createEmptyManuscriptHtml,
    parseManuscriptHtml,
    serializeManuscriptDocument,
} from "./manuscript-html";
import { ManuscriptServiceError } from "./manuscript-service";

describe("MANUSCRIPT_FILENAME", () => {
    it("points to manuscript.html in domain", () => {
        expect(MANUSCRIPT_FILENAME).toBe("manuscript.html");
    });
});

describe("parseManuscriptHtml / serializeManuscriptDocument", () => {
    it("round-trips an empty document", () => {
        const empty = createEmptyManuscriptHtml();
        expect(empty).toBe('<janus-manuscript version="1"></janus-manuscript>');
        const doc = parseManuscriptHtml(empty);
        expect(doc).toEqual({ version: 1, html: empty });
        expect(serializeManuscriptDocument(doc)).toBe(empty);
    });

    it("round-trips a single janus-p", () => {
        const input =
            '<janus-manuscript version="1"><janus-p>Hello</janus-p></janus-manuscript>';
        const doc = parseManuscriptHtml(input);
        expect(doc.html).toBe(input);
        expect(serializeManuscriptDocument(doc)).toBe(input);
    });

    it("round-trips Unicode in janus-p", () => {
        const input =
            '<janus-manuscript version="1"><janus-p>Café 你好</janus-p></janus-manuscript>';
        const doc = parseManuscriptHtml(input);
        expect(doc.html).toBe(input);
        expect(serializeManuscriptDocument(doc)).toBe(input);
    });

    it("stores janus-ai-comment body as plain text", () => {
        const input =
            '<janus-manuscript version="1"><janus-ai-comment id="550e8400-e29b-41d4-a716-446655440000">Write the opening scene.</janus-ai-comment></janus-manuscript>';
        const doc = parseManuscriptHtml(input);
        expect(doc.html).toBe(input);
    });

    it("rejects janus-ai-comment with nested elements", () => {
        const input =
            '<janus-manuscript version="1"><janus-ai-comment id="550e8400-e29b-41d4-a716-446655440000"><janus-p>nope</janus-p></janus-ai-comment></janus-manuscript>';
        expect(() => parseManuscriptHtml(input)).toThrow(ManuscriptServiceError);
        try {
            parseManuscriptHtml(input);
        } catch (error) {
            expect(error).toMatchObject({ code: "MANUSCRIPT_INVALID" });
        }
    });

    it("rejects unknown tags", () => {
        const input =
            '<janus-manuscript version="1"><div>foreign</div></janus-manuscript>';
        expect(() => parseManuscriptHtml(input)).toThrow(ManuscriptServiceError);
        try {
            parseManuscriptHtml(input);
        } catch (error) {
            expect(error).toMatchObject({ code: "MANUSCRIPT_INVALID" });
        }
    });

    it("rejects wrong root element", () => {
        expect(() =>
            parseManuscriptHtml('<html><body></body></html>'),
        ).toThrow(ManuscriptServiceError);
    });

    it("rejects missing version attribute", () => {
        const input = "<janus-manuscript></janus-manuscript>";
        try {
            parseManuscriptHtml(input);
        } catch (error) {
            expect(error).toMatchObject({ code: "MANUSCRIPT_INVALID" });
        }
    });

    it("serializeManuscriptDocument rejects non-v1 version", () => {
        const bad = { version: 2 as 1, html: createEmptyManuscriptHtml() };
        expect(() => serializeManuscriptDocument(bad)).toThrow(
            ManuscriptServiceError,
        );
    });
});
