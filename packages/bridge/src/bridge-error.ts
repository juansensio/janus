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

function messageIncludesAny(
    message: string,
    phrases: readonly string[],
): boolean {
    const lower = message.toLowerCase();
    return phrases.some((phrase) => lower.includes(phrase));
}

function isDuplicateBookTitleMessage(message: string): boolean {
    return messageIncludesAny(message, DUPLICATE_BOOK_TITLE_MARKERS);
}

/** Substrings of refusal text when IPC omits `code`; keep in sync with `ai.commentNotInstruction` locales. */
const AI_COMMENT_NOT_INSTRUCTION_MARKERS = [
    "instruction to add or change",
    "instrucción para añadir o cambiar",
] as const;

function isAiCommentNotInstructionMessage(message: string): boolean {
    return messageIncludesAny(message, AI_COMMENT_NOT_INSTRUCTION_MARKERS);
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
    if (message.length > 0 && isAiCommentNotInstructionMessage(message)) {
        return "AI_COMMENT_NOT_INSTRUCTION";
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
