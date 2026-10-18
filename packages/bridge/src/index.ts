import type { UiLanguageResult } from "./ui-language";

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

export type AiProviderStatus = {
    connected: boolean;
};

export type JanusBridgeErrorCode =
    | "BOOK_NOT_FOUND"
    | "INVALID_BOOK_ID"
    | "INVALID_BOOK_TITLE"
    | "DUPLICATE_BOOK_TITLE"
    | "MANUSCRIPT_READ_FAILED"
    | "MANUSCRIPT_WRITE_FAILED"
    | "MANUSCRIPT_INVALID"
    | "MANUSCRIPT_DRAFT_NOT_FOUND"
    | "MANUSCRIPT_COMMENT_NOT_FOUND"
    | "INVALID_LIBRARY_ROOT"
    | "LIBRARY_ROOT_CANCELLED"
    | "LIBRARY_ROOT_NOT_EMPTY"
    | "LIBRARY_ROOT_NOT_SUPPORTED"
    | "UNSUPPORTED_LANGUAGE"
    | "AI_NOT_SUPPORTED"
    | "AI_NOT_CONNECTED"
    | "AI_COMMENT_NOT_FOUND"
    | "AI_CONTEXT_TOO_LARGE"
    | "AI_PROVIDER_ERROR"
    | "AI_AUTH_FAILED"
    | "AI_AUTH_CANCELLED";

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
    acceptAiDraft(id: string, draftId: string): Promise<string>;
    rejectAiDraft(id: string, draftId: string): Promise<string>;
    insertOrReplaceDraft(
        id: string,
        commentId: string,
        draftHtml: string,
        draftId: string,
    ): Promise<string>;
    getAiProviderStatus(): Promise<AiProviderStatus>;
    connectOpenAiCodex(): Promise<void>;
    disconnectOpenAiCodex(): Promise<void>;
    writeForComment(
        id: string,
        commentId: string,
        locale: string,
        options?: { onDraftDelta?: (draftHtml: string) => void },
    ): Promise<string>;
    getLibraryRoot(): Promise<LibraryRootInfo>;
    chooseLibraryRoot(): Promise<ChooseLibraryRootResult>;
    getUiLanguage(): Promise<UiLanguageResult>;
    setUiLanguage(code: string): Promise<UiLanguageResult>;
}

export function createShellLabel(): string {
    return "Janus";
}

export { createMockJanusBridge } from "./mock-janus-bridge";
