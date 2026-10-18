import { bridgeErrorCode } from "@janus/bridge";

/** Maps IPC write failures to `ai.*` locale keys. */
export function aiWriteErrorKey(error: unknown): string {
    const code = bridgeErrorCode(error);
    switch (code) {
        case "AI_NOT_CONNECTED":
            return "ai.writeNotConnected";
        case "AI_COMMENT_NOT_FOUND":
            return "ai.writeCommentNotFound";
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
