export const MAX_BOOK_TITLE_LENGTH = 200;

export type BookTitleErrorCode = "INVALID_BOOK_TITLE";

export class InvalidBookTitleError extends Error {
    readonly code: BookTitleErrorCode = "INVALID_BOOK_TITLE";

    constructor(message: string) {
        super(message);
        this.name = "InvalidBookTitleError";
    }
}

export function normalizeBookTitle(raw: string): string {
    const title = raw.trim();
    if (title.length === 0) {
        throw new InvalidBookTitleError("Book title is required");
    }
    if (title.length > MAX_BOOK_TITLE_LENGTH) {
        throw new InvalidBookTitleError("Book title is too long");
    }
    return title;
}
