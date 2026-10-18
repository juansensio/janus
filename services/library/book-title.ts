export const MAX_BOOK_TITLE_LENGTH = 200;

export type BookTitleErrorCode = "INVALID_BOOK_TITLE";

export type DuplicateBookTitleErrorCode = "DUPLICATE_BOOK_TITLE";

export class InvalidBookTitleError extends Error {
    readonly code: BookTitleErrorCode = "INVALID_BOOK_TITLE";

    constructor(message: string) {
        super(message);
        this.name = "InvalidBookTitleError";
    }
}

export class DuplicateBookTitleError extends Error {
    readonly code: DuplicateBookTitleErrorCode = "DUPLICATE_BOOK_TITLE";

    constructor(message: string) {
        super(message);
        this.name = "DuplicateBookTitleError";
    }
}

export function assertTitleNotDuplicate(
    title: string,
    books: ReadonlyArray<{ id: string; title: string }>,
    excludeId?: string,
): void {
    const clash = books.some(
        (book) => book.id !== excludeId && book.title === title,
    );
    if (clash) {
        throw new DuplicateBookTitleError(
            "That name is already on your shelf. Choose a different book name.",
        );
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
