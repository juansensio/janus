const IPC_INVOKE_WRAP =
    /^Error invoking remote method '[^']+':(?: Error:)? (.+)$/;

export function unwrapIpcInvokeMessage(message: string): string {
    const match = message.match(IPC_INVOKE_WRAP);
    return match?.[1] ?? message;
}

const DUPLICATE_BOOK_TITLE_MARKERS = [
    "that name already exists. choose a different name.",
    "that name is already on your shelf. choose a different book name.",
] as const;

function isDuplicateBookTitleMessage(message: string): boolean {
    const lower = message.toLowerCase();
    return DUPLICATE_BOOK_TITLE_MARKERS.some((phrase) => lower.includes(phrase));
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
    const message = extractErrorMessage(error);
    if (message.length > 0 && isDuplicateBookTitleMessage(message)) {
        return "DUPLICATE_BOOK_TITLE";
    }
    return undefined;
}

export function extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return unwrapIpcInvokeMessage(error.message);
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
