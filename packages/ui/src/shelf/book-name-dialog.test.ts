import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { t } from "../i18n";
import { initTestI18n } from "../test-i18n";
import { openBookNameDialog } from "./book-name-dialog";

beforeEach(() => {
    initTestI18n("en");
});

afterEach(() => {
    document.body.innerHTML = "";
});

function openTestDialog(
    onConfirm: (title: string) => void | Promise<void> = async () => {},
) {
    const opener = document.createElement("button");
    document.body.append(opener);
    openBookNameDialog({
        mode: "create",
        initialValue: "My Book",
        returnFocusTo: opener,
        onConfirm,
    });
}

describe("openBookNameDialog (modal contract)", () => {
    it("closes on Escape without calling onConfirm", () => {
        const onConfirm = vi.fn();
        openTestDialog(onConfirm);

        document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );

        expect(document.querySelector(".shelf-dialog-overlay")).toBeNull();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("submits on Enter via form submit", async () => {
        const onConfirm = vi.fn(async () => {});
        openTestDialog(onConfirm);

        (
            document.querySelector(".shelf-dialog-form") as HTMLFormElement
        ).requestSubmit();

        await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledWith("My Book"));
        expect(document.querySelector(".shelf-dialog-overlay")).toBeNull();
    });

    it("shows explicit duplicate error inline and keeps modal open", async () => {
        const onConfirm = vi.fn(async () => {
            throw Object.assign(new Error("dup"), {
                code: "DUPLICATE_BOOK_TITLE",
            });
        });
        openTestDialog(onConfirm);

        (
            document.querySelector(".shelf-dialog-form") as HTMLFormElement
        ).requestSubmit();

        await vi.waitFor(() => expect(onConfirm).toHaveBeenCalledOnce());
        expect(document.querySelector(".shelf-dialog-overlay")).not.toBeNull();
        const validation = document.querySelector(".shelf-dialog-validation");
        expect(validation?.textContent).toBe(
            t("library.dialog.duplicateTitle"),
        );
        expect(validation?.hidden).toBe(false);

        const input = document.querySelector(
            "#shelf-book-name-input",
        ) as HTMLInputElement;
        expect(input.getAttribute("aria-invalid")).toBe("true");
        expect(input.getAttribute("aria-describedby")).toBe(
            "shelf-book-name-dialog-error",
        );
    });

    it("does not show generic create failed for duplicate code", async () => {
        openTestDialog(async () => {
            throw Object.assign(new Error("dup"), {
                code: "DUPLICATE_BOOK_TITLE",
            });
        });

        (
            document.querySelector(".shelf-dialog-form") as HTMLFormElement
        ).requestSubmit();

        await vi.waitFor(() =>
            expect(
                document.querySelector(".shelf-dialog-validation")?.textContent,
            ).not.toBe(t("library.createFailed")),
        );
    });
});
