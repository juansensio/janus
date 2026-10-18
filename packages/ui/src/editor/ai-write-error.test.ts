import { describe, expect, it } from "vitest";
import { aiWriteErrorKey, aiWriteErrorMessage } from "./ai-write-error";

const t = (key: string) => `tr:${key}`;

describe("aiWriteErrorKey", () => {
    it("maps AI_NOT_CONNECTED", () => {
        expect(
            aiWriteErrorKey(
                Object.assign(new Error("x"), { code: "AI_NOT_CONNECTED" }),
            ),
        ).toBe("ai.writeNotConnected");
    });

    it("maps AI_CONTEXT_TOO_LARGE", () => {
        expect(
            aiWriteErrorKey(
                Object.assign(new Error("x"), { code: "AI_CONTEXT_TOO_LARGE" }),
            ),
        ).toBe("ai.writeContextTooLarge");
    });

    it("maps AI_COMMENT_NOT_INSTRUCTION to locale key", () => {
        expect(
            aiWriteErrorKey(
                Object.assign(new Error("x"), {
                    code: "AI_COMMENT_NOT_INSTRUCTION",
                }),
            ),
        ).toBe("ai.commentNotInstruction");
    });

    it("falls back to generic write failure", () => {
        expect(aiWriteErrorKey(new Error("boom"))).toBe("ai.writeFailed");
    });
});

describe("aiWriteErrorMessage", () => {
    it("returns the model message for AI_COMMENT_NOT_INSTRUCTION when non-empty", () => {
        expect(
            aiWriteErrorMessage(
                Object.assign(new Error("Use an instruction."), {
                    code: "AI_COMMENT_NOT_INSTRUCTION",
                }),
                t,
            ),
        ).toBe("Use an instruction.");
    });

    it("falls back to locale string when the refusal message is empty", () => {
        expect(
            aiWriteErrorMessage(
                Object.assign(new Error(""), {
                    code: "AI_COMMENT_NOT_INSTRUCTION",
                }),
                t,
            ),
        ).toBe("tr:ai.commentNotInstruction");
    });
});
