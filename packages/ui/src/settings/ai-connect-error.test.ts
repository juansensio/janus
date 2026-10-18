import { describe, expect, it } from "vitest";
import { aiConnectErrorKey } from "./ai-connect-error";

describe("aiConnectErrorKey", () => {
    it("maps cancelled sign-in", () => {
        const error = Object.assign(new Error("Sign-in was cancelled"), {
            code: "AI_AUTH_CANCELLED",
        });
        expect(aiConnectErrorKey(error)).toBe("ai.connectCancelled");
    });

    it("maps auth failures", () => {
        const error = Object.assign(new Error("Session expired"), {
            code: "AI_AUTH_FAILED",
        });
        expect(aiConnectErrorKey(error)).toBe("ai.connectAuthFailed");
    });

    it("falls back to generic connect failure", () => {
        expect(aiConnectErrorKey(new Error("boom"))).toBe("ai.connectFailed");
    });
});
