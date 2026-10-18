import { describe, expect, it } from "vitest";
import { AiAssistError } from "./provider";
import { draftParagraphsToHtml, parseWriteResult } from "./write-result";

describe("parseWriteResult", () => {
    it("accepts a draft payload", () => {
        expect(
            parseWriteResult(
                JSON.stringify({
                    kind: "draft",
                    paragraphs: ["One", "Two"],
                }),
            ),
        ).toEqual({ kind: "draft", paragraphs: ["One", "Two"] });
    });

    it("accepts a refusal payload", () => {
        expect(
            parseWriteResult(
                JSON.stringify({
                    kind: "refusal",
                    message: "Not an instruction.",
                }),
            ),
        ).toEqual({
            kind: "refusal",
            message: "Not an instruction.",
        });
    });

    it("rejects prose", () => {
        expect(() => parseWriteResult("Just some prose.")).toThrow(AiAssistError);
    });

    it("rejects HTML", () => {
        expect(() =>
            parseWriteResult("<janus-p>Hello</janus-p>"),
        ).toThrow(AiAssistError);
    });

    it("rejects JSON without kind", () => {
        expect(() =>
            parseWriteResult(JSON.stringify({ paragraphs: ["x"] })),
        ).toThrow(AiAssistError);
        try {
            parseWriteResult(JSON.stringify({ paragraphs: ["x"] }));
        } catch (error) {
            expect(error).toMatchObject({ code: "AI_PROVIDER_ERROR" });
        }
    });
});

describe("draftParagraphsToHtml", () => {
    it("wraps plain paragraphs", () => {
        expect(draftParagraphsToHtml(["A", "B"])).toBe(
            "<janus-p>A</janus-p><janus-p>B</janus-p>",
        );
    });
});
