import { assertSupported } from "@janus/languages";
import {
    buildUiLanguage,
    buildUiLanguageForCode,
    type UiLanguageResult,
} from "./ui-language";

export {
    bridgeErrorCode,
    extractErrorMessage,
    unwrapIpcInvokeMessage,
} from "./bridge-error";

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
export type LibraryRootSource =
    | "env"
    | "dev-default"
    | "settings"
    | "documents"
    | "user-data";

export type LibraryRootInfo = {
    path: string;
    source: LibraryRootSource;
};

export type ChooseLibraryRootResult = {
    path: string;
    needsReload: boolean;
};

export type JanusBridgeErrorCode =
    | "BOOK_NOT_FOUND"
    | "INVALID_BOOK_ID"
    | "INVALID_BOOK_TITLE"
    | "DUPLICATE_BOOK_TITLE"
    | "MANUSCRIPT_READ_FAILED"
    | "MANUSCRIPT_WRITE_FAILED"
    | "INVALID_LIBRARY_ROOT"
    | "LIBRARY_ROOT_CANCELLED"
    | "LIBRARY_ROOT_NOT_EMPTY"
    | "LIBRARY_ROOT_NOT_SUPPORTED"
    | "UNSUPPORTED_LANGUAGE";

export type { UiLanguageResult } from "./ui-language";
export { buildUiLanguage, buildUiLanguageForCode } from "./ui-language";
export { formatMessage } from "@janus/languages";
export {
    normalizeJanusSettings,
    type JanusSettings,
} from "./janus-settings";

export interface JanusBridge {
    platform(): Platform;
    listBooks(): Promise<BookSummary[]>;
    suggestNewBookTitle(): Promise<string>;
    createBook(title: string): Promise<BookSummary>;
    renameBook(id: string, title: string): Promise<BookSummary>;
    deleteBook(id: string): Promise<void>;
    readManuscript(id: string): Promise<string>;
    writeManuscript(id: string, text: string): Promise<void>;
    getLibraryRoot(): Promise<LibraryRootInfo>;
    chooseLibraryRoot(): Promise<ChooseLibraryRootResult>;
    getUiLanguage(): Promise<UiLanguageResult>;
    setUiLanguage(code: string): Promise<UiLanguageResult>;
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

function createMockManuscriptStore(): Map<string, string> {
    return new Map();
}

/** Minimal async stubs for Vitest and local UI work. */
export function createMockJanusBridge(
    overrides: Partial<JanusBridge> = {},
): JanusBridge {
    const manuscripts = createMockManuscriptStore();
    let mockSavedLocale: string | null = null;
    return {
        platform: () => "desktop",
        listBooks: async () => EMPTY_BOOKS,
        suggestNewBookTitle: async () => "Untitled",
        createBook: async () => defaultBook,
        renameBook: async (_id, title) => ({
            ...defaultBook,
            title,
        }),
        deleteBook: async (id) => {
            manuscripts.delete(id);
        },
        readManuscript: async (id) => manuscripts.get(id) ?? "",
        writeManuscript: async (id, text) => {
            manuscripts.set(id, text);
        },
        getLibraryRoot: async () => ({
            path: "/tmp/janus-mock-library",
            source: "user-data",
        }),
        chooseLibraryRoot: async () => ({
            path: "/tmp/janus-mock-library",
            needsReload: true,
        }),
        getUiLanguage: async () =>
            buildUiLanguage(mockSavedLocale, "en"),
        setUiLanguage: async (code: string) => {
            assertSupported(code);
            mockSavedLocale = code;
            return buildUiLanguageForCode(code);
        },
        ...overrides,
    };
}
