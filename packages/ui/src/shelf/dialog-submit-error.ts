import { SHELF_STRINGS } from "./strings";

type BookNameDialogMode = "create" | "rename";

const IPC_INVOKE_WRAP =
    /^Error invoking remote method '[^']+':(?: Error:)? (.+)$/;

export function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        const match = error.message.match(IPC_INVOKE_WRAP);
        return match?.[1] ?? error.message;
    }
    if (
        error !== null &&
        typeof error === "object" &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
    ) {
        return (error as { message: string }).message;
    }
    return "";
}

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
