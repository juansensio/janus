import { describe, expect, it } from "vitest";
import { aiWriteErrorKey } from "./ai-write-error";

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

    it("falls back to generic write failure", () => {
        expect(aiWriteErrorKey(new Error("boom"))).toBe("ai.writeFailed");
    });
});
