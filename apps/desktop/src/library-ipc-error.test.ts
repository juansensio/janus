import { describe, expect, it } from "vitest";
import {
    isLibraryIpcReject,
    libraryErrorFromIpcFailure,
    toLibraryIpcReject,
} from "./library-ipc-error";

describe("library-ipc-error", () => {
    it("recognizes serializable ipc reject payloads", () => {
        expect(
            isLibraryIpcReject(
                toLibraryIpcReject("dup", "DUPLICATE_BOOK_TITLE"),
            ),
        ).toBe(true);
    });

    it("rebuilds Error with code from ipc reject payload", () => {
        const err = libraryErrorFromIpcFailure(
            toLibraryIpcReject(
                "That name is already on your shelf. Choose a different book name.",
                "DUPLICATE_BOOK_TITLE",
            ),
        );
        expect(err.message).toContain("already on your shelf");
        expect((err as Error & { code: string }).code).toBe(
            "DUPLICATE_BOOK_TITLE",
        );
    });

    it("rebuilds Error with code for AI write instruction refusals", () => {
        const err = libraryErrorFromIpcFailure(
            toLibraryIpcReject(
                "Please provide an instruction to add or change the prose.",
                "AI_COMMENT_NOT_INSTRUCTION",
            ),
        );
        expect(err.message).toBe(
            "Please provide an instruction to add or change the prose.",
        );
        expect((err as Error & { code: string }).code).toBe(
            "AI_COMMENT_NOT_INSTRUCTION",
        );
    });

});
