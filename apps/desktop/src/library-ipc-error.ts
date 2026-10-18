import type { JanusBridgeErrorCode } from "@janus/bridge";

/** Serializable reject payload for `ipcMain.handle` (custom `Error` fields do not reach the renderer). */
export type LibraryIpcReject = {
    message: string;
    code: JanusBridgeErrorCode | string;
};

export function toLibraryIpcReject(
    message: string,
    code: JanusBridgeErrorCode | string,
): LibraryIpcReject {
    return { message, code };
}

export function isLibraryIpcReject(value: unknown): value is LibraryIpcReject {
    return (
        value !== null &&
        typeof value === "object" &&
        "message" in value &&
        typeof (value as { message: unknown }).message === "string" &&
        "code" in value &&
        typeof (value as { code: unknown }).code === "string"
    );
}

const IPC_INVOKE_WRAP =
    /^Error invoking remote method '[^']+':(?: Error:)? (.+)$/;

export function unwrapIpcInvokeMessage(message: string): string {
    const match = message.match(IPC_INVOKE_WRAP);
    return match?.[1] ?? message;
}

/** Rebuild a renderer-side `Error` with stable `code` after `ipcRenderer.invoke`. */
export function libraryErrorFromIpcFailure(error: unknown): Error {
    if (isLibraryIpcReject(error)) {
        return Object.assign(new Error(error.message), { code: error.code });
    }
    if (error instanceof Error) {
        const message = unwrapIpcInvokeMessage(error.message);
        const code = bridgeErrorCode(error);
        if (code) {
            return Object.assign(new Error(message), { code });
        }
        return Object.assign(new Error(message), { code: "UNKNOWN" });
    }
    return Object.assign(new Error("Library operation failed"), {
        code: "UNKNOWN",
    });
}

function bridgeErrorCode(error: unknown): string | undefined {
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

export async function invokeLibraryIpc<T>(
    invoke: (channel: string, ...args: unknown[]) => Promise<T>,
    channel: string,
    ...args: unknown[]
): Promise<T> {
    try {
        return await invoke(channel, ...args);
    } catch (error) {
        throw libraryErrorFromIpcFailure(error);
    }
}
