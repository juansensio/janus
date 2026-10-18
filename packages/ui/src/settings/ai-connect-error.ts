import { bridgeErrorCode } from "@janus/bridge";

/** Maps IPC connect failures to `ai.*` locale keys. */
export function aiConnectErrorKey(error: unknown): string {
    const code = bridgeErrorCode(error);
    if (code === "AI_AUTH_CANCELLED") {
        return "ai.connectCancelled";
    }
    if (code === "AI_AUTH_FAILED") {
        const message =
            error instanceof Error ? error.message.toLowerCase() : "";
        if (message.includes("network") || message.includes("fetch")) {
            return "ai.connectNetwork";
        }
        return "ai.connectAuthFailed";
    }
    return "ai.connectFailed";
}
