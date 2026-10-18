export type ShelfServiceErrorCode =
    | "BOOK_NOT_FOUND"
    | "INVALID_BOOK_ID"
    | "INVALID_BOOK_TITLE"
    | "DUPLICATE_BOOK_TITLE";

export class ShelfServiceError extends Error {
    readonly code: ShelfServiceErrorCode;

    constructor(code: ShelfServiceErrorCode, message: string) {
        super(message);
        this.name = "ShelfServiceError";
        this.code = code;
    }
}
