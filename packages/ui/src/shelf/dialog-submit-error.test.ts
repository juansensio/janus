import { beforeEach, describe, expect, it } from "vitest";
import { t } from "../i18n";
import { initTestI18n } from "../test-i18n";
import { messageForDialogSubmitError } from "./dialog-submit-error";

beforeEach(() => {
    initTestI18n("en");
});

describe("messageForDialogSubmitError", () => {
    it("maps DUPLICATE_BOOK_TITLE code to duplicate copy", () => {
        expect(
            messageForDialogSubmitError(
                Object.assign(new Error("x"), {
                    code: "DUPLICATE_BOOK_TITLE",
                }),
                "create",
            ),
        ).toBe(t("library.dialog.duplicateTitle"));
    });

    it("falls back to create failed for unknown errors", () => {
        expect(
            messageForDialogSubmitError(new Error("network"), "create"),
        ).toBe(t("library.createFailed"));
    });

    it("maps duplicate title from ipc-wrapped message when code is missing", () => {
        expect(
            messageForDialogSubmitError(
                new Error(
                    "Error invoking remote method 'janus:library:createBook': That name already exists. Choose a different name.",
                ),
                "create",
            ),
        ).toBe(t("library.dialog.duplicateTitle"));
    });

    it("maps duplicate title on rename mode", () => {
        expect(
            messageForDialogSubmitError(
                Object.assign(new Error("dup"), {
                    code: "DUPLICATE_BOOK_TITLE",
                }),
                "rename",
            ),
        ).toBe(t("library.dialog.duplicateTitle"));
    });

    it("shows explicit duplicate copy not generic create failed", () => {
        const message = messageForDialogSubmitError(
            new Error(
                "Error invoking remote method 'janus:library:createBook': That name already exists. Choose a different name.",
            ),
            "create",
        );
        expect(message).toBe(
            "That name already exists. Choose a different name.",
        );
        expect(message).not.toBe(t("library.createFailed"));
    });
});
