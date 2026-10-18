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
});
