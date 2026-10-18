import { SHELF_STRINGS } from "./strings";

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
            ? SHELF_STRINGS.dialogCreateTitle
            : SHELF_STRINGS.dialogRenameTitle;
    dialog.setAttribute("aria-labelledby", heading.id);

    const label = document.createElement("label");
    label.className = "shelf-dialog-label";
    label.htmlFor = "shelf-book-name-input";
    label.textContent = SHELF_STRINGS.dialogNameLabel;

    const input = document.createElement("input");
    input.type = "text";
    input.id = "shelf-book-name-input";
    input.className = "shelf-dialog-input";
    input.value = initialValue;
    input.autocomplete = "off";

    const validation = document.createElement("p");
    validation.className = "shelf-dialog-validation";
    validation.hidden = true;
    validation.textContent = SHELF_STRINGS.dialogInvalidTitle;

    const form = document.createElement("form");
    form.className = "shelf-dialog-form";
    form.noValidate = true;

    const actions = document.createElement("div");
    actions.className = "shelf-dialog-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "shelf-dialog-button shelf-dialog-button--ghost";
    cancelButton.textContent = SHELF_STRINGS.dialogCancel;

    const confirmButton = document.createElement("button");
    confirmButton.type = "submit";
    confirmButton.className =
        "shelf-dialog-button shelf-dialog-button--primary";
    confirmButton.textContent =
        mode === "create"
            ? SHELF_STRINGS.dialogCreate
            : SHELF_STRINGS.dialogSave;

    actions.append(cancelButton, confirmButton);
    form.append(label, input, validation, actions);
    dialog.append(heading, form);
    overlay.append(dialog);
    document.body.append(overlay);

    const focusable = [input, cancelButton, confirmButton];

    function updateConfirmState(): void {
        const invalid = isWhitespaceOnly(input.value);
        confirmButton.disabled = invalid;
        validation.hidden = !invalid;
    }

    function close(): void {
        overlay.remove();
        document.removeEventListener("keydown", onKeyDown);
        returnFocusTo.focus();
    }

    function onKeyDown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            event.preventDefault();
            close();
            return;
        }
        if (event.key === "Tab") {
            const index = focusable.indexOf(
                document.activeElement as HTMLElement,
            );
            if (index === -1) {
                return;
            }
            event.preventDefault();
            const next =
                event.shiftKey
                    ? focusable[(index - 1 + focusable.length) % focusable.length]
                    : focusable[(index + 1) % focusable.length];
            next.focus();
        }
    }

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            close();
        }
    });

    cancelButton.addEventListener("click", () => close());

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (confirmButton.disabled) {
            return;
        }
        void (async () => {
            await onConfirm(input.value);
            if (overlay.isConnected) {
                close();
            }
        })();
    });

    input.addEventListener("input", updateConfirmState);

    document.addEventListener("keydown", onKeyDown);
    updateConfirmState();
    input.focus();
    input.select();
}
