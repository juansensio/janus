import { describe, expect, it } from "vitest";
import {
    bridgeErrorCode,
    extractErrorMessage,
    unwrapIpcInvokeMessage,
} from "./bridge-error";

describe("unwrapIpcInvokeMessage", () => {
    it("strips electron invoke wrapper", () => {
        expect(
            unwrapIpcInvokeMessage(
                "Error invoking remote method 'janus:library:createBook': Error: That name is already on your shelf. Choose a different book name.",
            ),
        ).toBe(
            "That name is already on your shelf. Choose a different book name.",
        );
    });

    it("returns message unchanged when not wrapped", () => {
        expect(unwrapIpcInvokeMessage("plain")).toBe("plain");
    });
});

describe("bridgeErrorCode", () => {
    it("reads code from error-like objects", () => {
        expect(
            bridgeErrorCode(
                Object.assign(new Error("x"), { code: "DUPLICATE_BOOK_TITLE" }),
            ),
        ).toBe("DUPLICATE_BOOK_TITLE");
    });
});

describe("extractErrorMessage", () => {
    it("unwraps Error messages", () => {
        expect(
            extractErrorMessage(
                new Error(
                    "Error invoking remote method 'janus:library:createBook': network",
                ),
            ),
        ).toBe("network");
    });
});
