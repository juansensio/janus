export type Platform = "desktop" | "mobile";

/** Shelf row returned by library bridge methods. */
export type BookSummary = {
    id: string;
    title: string;
    createdAt: string;
};

/**
 * Bridge methods reject with `Error` objects whose `code` is a stable string
 * (for example `BOOK_NOT_FOUND`). Callers and tests should read `code`, not
 * message text.
 */
export type JanusBridgeErrorCode =
    | "BOOK_NOT_FOUND"
    | "INVALID_BOOK_ID"
    | "INVALID_BOOK_TITLE"
    | "DUPLICATE_BOOK_TITLE";

export interface JanusBridge {
    platform(): Platform;
    listBooks(): Promise<BookSummary[]>;
    suggestNewBookTitle(): Promise<string>;
    createBook(title: string): Promise<BookSummary>;
    renameBook(id: string, title: string): Promise<BookSummary>;
    deleteBook(id: string): Promise<void>;
}

export function createShellLabel(): string {
    return "Janus";
}

const EMPTY_BOOKS: BookSummary[] = [];

const defaultBook: BookSummary = {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Untitled",
    createdAt: "2026-01-01T00:00:00.000Z",
};

/** Minimal async stubs for Vitest and local UI work. */
export function createMockJanusBridge(
    overrides: Partial<JanusBridge> = {},
): JanusBridge {
    return {
        platform: () => "desktop",
        listBooks: async () => EMPTY_BOOKS,
        suggestNewBookTitle: async () => "Untitled",
        createBook: async () => defaultBook,
        renameBook: async (_id, title) => ({
            ...defaultBook,
            title,
        }),
        deleteBook: async () => {},
        ...overrides,
    };
}
