import { SHELF_STRINGS } from "./strings";

type BookNameDialogMode = "create" | "rename";

export function bridgeErrorCode(error: unknown): string | undefined {
    if (
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
    ) {
        return (error as { code: string }).code;
    }
    return undefined;
}

export function messageForDialogSubmitError(
    error: unknown,
    mode: BookNameDialogMode,
): string {
    const code = bridgeErrorCode(error);
    if (code === "DUPLICATE_BOOK_TITLE") {
        return SHELF_STRINGS.dialogDuplicateTitle;
    }
    if (code === "INVALID_BOOK_TITLE") {
        return SHELF_STRINGS.dialogInvalidTitle;
    }
    return mode === "create"
        ? SHELF_STRINGS.createFailed
        : SHELF_STRINGS.renameFailed;
}
