const IPC_INVOKE_WRAP =
    /^Error invoking remote method '[^']+':(?: Error:)? (.+)$/;

export function unwrapIpcInvokeMessage(message: string): string {
    const match = message.match(IPC_INVOKE_WRAP);
    return match?.[1] ?? message;
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
