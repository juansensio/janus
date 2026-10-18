import { t } from "../i18n";
import { messageForDialogSubmitError } from "./dialog-submit-error";

export type BookNameDialogMode = "create" | "rename";

export type OpenBookNameDialogOptions = {
    mode: BookNameDialogMode;
    initialValue: string;
    returnFocusTo: HTMLElement;
    onConfirm: (title: string) => void | Promise<void>;
};

function isWhitespaceOnly(value: string): boolean {
    return value.trim().length === 0;
}

export function openBookNameDialog(options: OpenBookNameDialogOptions): void {
    const { mode, initialValue, returnFocusTo, onConfirm } = options;

    const overlay = document.createElement("div");
    overlay.className = "shelf-dialog-overlay";

    const dialog = document.createElement("div");
    dialog.className = "shelf-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");

    const heading = document.createElement("h2");
    heading.className = "shelf-dialog-title";
    heading.id = "shelf-book-name-dialog-title";
    heading.textContent =
        mode === "create"
            ? t("library.dialog.createTitle")
            : t("library.dialog.renameTitle");
    dialog.setAttribute("aria-labelledby", heading.id);

    const label = document.createElement("label");
    label.className = "shelf-dialog-label";
    label.htmlFor = "shelf-book-name-input";
    label.textContent = t("library.dialog.nameLabel");

    const input = document.createElement("input");
    input.type = "text";
    input.id = "shelf-book-name-input";
    input.className = "shelf-dialog-input";
    input.value = initialValue;
    input.autocomplete = "off";

    const validation = document.createElement("p");
    validation.className = "shelf-dialog-validation";
    validation.id = "shelf-book-name-dialog-error";
    validation.hidden = true;
    validation.setAttribute("role", "alert");
    validation.textContent = t("library.dialog.invalidTitle");
    input.setAttribute("aria-describedby", validation.id);

    const form = document.createElement("form");
    form.className = "shelf-dialog-form";
    form.noValidate = true;

    const actions = document.createElement("div");
    actions.className = "shelf-dialog-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "shelf-dialog-button shelf-dialog-button--ghost";
    cancelButton.textContent = t("library.dialog.cancel");

    const confirmButton = document.createElement("button");
    confirmButton.type = "submit";
    confirmButton.className =
        "shelf-dialog-button shelf-dialog-button--primary";
    confirmButton.textContent =
        mode === "create"
            ? t("library.dialog.create")
            : t("library.dialog.save");

    actions.append(cancelButton, confirmButton);
    form.append(label, input, validation, actions);
    dialog.append(heading, form);
    overlay.append(dialog);
    document.body.append(overlay);

    function closeDialog(): void {
        overlay.remove();
        returnFocusTo.focus();
    }

    function showFieldError(message: string): void {
        validation.textContent = message;
        validation.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.focus();
    }

    function hideFieldError(): void {
        validation.hidden = true;
        validation.textContent = t("library.dialog.invalidTitle");
        input.removeAttribute("aria-invalid");
    }

    cancelButton.addEventListener("click", () => {
        closeDialog();
    });

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            closeDialog();
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        hideFieldError();
        const value = input.value;
        if (isWhitespaceOnly(value)) {
            showFieldError(t("library.dialog.invalidTitle"));
            return;
        }
        void (async () => {
            try {
                await onConfirm(value.trim());
                closeDialog();
            } catch (error) {
                showFieldError(messageForDialogSubmitError(error, mode));
            }
        })();
    });

    document.addEventListener(
        "keydown",
        (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeDialog();
            }
        },
        { once: true },
    );

    input.focus();
    input.select();
}
