import type { JanusBridgeErrorCode } from "@janus/bridge";
import { ShelfServiceError } from "@janus/library";

export class LibraryBridgeError extends Error {
    readonly code: JanusBridgeErrorCode;

    constructor(code: JanusBridgeErrorCode, message: string) {
        super(message);
        this.name = "LibraryBridgeError";
        this.code = code;
    }
}

export function toBridgeRejectValue(
    error: unknown,
): { message: string; code: string } {
    if (error instanceof ShelfServiceError) {
        return { message: error.message, code: error.code };
    }
    if (error instanceof LibraryBridgeError) {
        return { message: error.message, code: error.code };
    }
    if (
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as { code: unknown }).code === "string"
    ) {
        const record = error as { code: string; message?: string };
        return {
            code: record.code,
            message:
                typeof record.message === "string"
                    ? record.message
                    : "Library operation failed",
        };
    }
    return { code: "UNKNOWN", message: "Library operation failed" };
}
