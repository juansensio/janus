import { bridgeErrorCode, extractErrorMessage } from "@janus/bridge";

/** Maps IPC write failures to `ai.*` locale keys. */
export function aiWriteErrorKey(error: unknown): string {
    const code = bridgeErrorCode(error);
    switch (code) {
        case "AI_NOT_CONNECTED":
            return "ai.writeNotConnected";
        case "AI_COMMENT_NOT_FOUND":
            return "ai.writeCommentNotFound";
        case "AI_COMMENT_NOT_INSTRUCTION":
            return "ai.commentNotInstruction";
        case "AI_CONTEXT_TOO_LARGE":
            return "ai.writeContextTooLarge";
        case "AI_AUTH_FAILED":
            return "ai.writeAuthFailed";
        case "AI_PROVIDER_ERROR":
            return "ai.writeProviderFailed";
        default:
            return "ai.writeFailed";
    }
}

/** User-facing write error text; prefers provider message for instruction refusals. */
export function aiWriteErrorMessage(
    error: unknown,
    t: (key: string) => string,
): string {
    const code = bridgeErrorCode(error);
    if (code === "AI_COMMENT_NOT_INSTRUCTION") {
        const message = extractErrorMessage(error).trim();
        if (message.length > 0) {
            return message;
        }
        return t("ai.commentNotInstruction");
    }
    return t(aiWriteErrorKey(error));
}
