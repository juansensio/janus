import { describe, expect, it } from "vitest";
import {
    messageForDialogSubmitError,
} from "./dialog-submit-error";
import { SHELF_STRINGS } from "./strings";

describe("messageForDialogSubmitError", () => {
    it("maps DUPLICATE_BOOK_TITLE code to duplicate copy", () => {
        expect(
            messageForDialogSubmitError(
                Object.assign(new Error("x"), {
                    code: "DUPLICATE_BOOK_TITLE",
                }),
                "create",
            ),
        ).toBe(SHELF_STRINGS.dialogDuplicateTitle);
    });

    it("maps electron-wrapped duplicate message without code", () => {
        expect(
            messageForDialogSubmitError(
                new Error(
                    "Error invoking remote method 'janus:library:createBook': Error: That name is already on your shelf. Choose a different book name.",
                ),
                "create",
            ),
        ).toBe(SHELF_STRINGS.dialogDuplicateTitle);
    });

    it("falls back to create failed for unknown errors", () => {
        expect(
            messageForDialogSubmitError(new Error("network"), "create"),
        ).toBe(SHELF_STRINGS.createFailed);
    });
});
