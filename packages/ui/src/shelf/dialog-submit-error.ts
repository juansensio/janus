import { bridgeErrorCode, extractErrorMessage } from "@janus/bridge";
import { SHELF_STRINGS } from "./strings";

type BookNameDialogMode = "create" | "rename";

function isDuplicateTitleFailure(error: unknown): boolean {
    if (bridgeErrorCode(error) === "DUPLICATE_BOOK_TITLE") {
        return true;
    }
    const message = extractErrorMessage(error);
    return (
        message === SHELF_STRINGS.dialogDuplicateTitle ||
        (message.includes("already on your shelf") &&
            message.includes("Choose a different book name"))
    );
}

export function messageForDialogSubmitError(
    error: unknown,
    mode: BookNameDialogMode,
): string {
    if (isDuplicateTitleFailure(error)) {
        return SHELF_STRINGS.dialogDuplicateTitle;
    }
    if (bridgeErrorCode(error) === "INVALID_BOOK_TITLE") {
        return SHELF_STRINGS.dialogInvalidTitle;
    }
    return mode === "create"
        ? SHELF_STRINGS.createFailed
        : SHELF_STRINGS.renameFailed;
}
