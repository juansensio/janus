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

export type SupportDocKind = "worldbuilding";

/** Support document row for project nav in the editor. */
export type SupportDocSummary = {
    kind: SupportDocKind;
    exists: boolean;
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

export type OpenAiModelSettings = {
    preference: string;
    options: string[];
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
    | "AI_COMMENT_NOT_INSTRUCTION"
    | "AI_CONTEXT_TOO_LARGE"
    | "AI_PROVIDER_ERROR"
    | "AI_AUTH_FAILED"
    | "AI_AUTH_CANCELLED"
    | "INVALID_EDITOR_ZOOM"
    | "INVALID_SUPPORT_DOC_KIND"
    | "SUPPORT_DOC_NOT_FOUND"
    | "SUPPORT_DOC_ALREADY_EXISTS"
    | "SUPPORT_DOC_READ_FAILED"
    | "SUPPORT_DOC_WRITE_FAILED"
    | "SUPPORT_DOC_INVALID";

export type { UiLanguageResult } from "./ui-language";
export { buildUiLanguage, buildUiLanguageForCode } from "./ui-language";
export { formatMessage } from "@janus/languages";
export {
    normalizeJanusSettings,
    type JanusSettings,
} from "./janus-settings";
export {
    buildEditorZoomResult,
    type EditorZoomResult,
} from "./editor-zoom";

export type EditorZoomMenuAction = "in" | "out" | "reset";

export type HighlightRewriteSpan = {
    blockIndex: number;
    start: number;
    end: number;
};

export type BeginHighlightRewriteInput = {
    commentId: string;
    instruction: string;
    spans: HighlightRewriteSpan[];
};

export interface JanusBridge {
    platform(): Platform;
    listBooks(): Promise<BookSummary[]>;
    suggestNewBookTitle(): Promise<string>;
    createBook(title: string): Promise<BookSummary>;
    renameBook(id: string, title: string): Promise<BookSummary>;
    deleteBook(id: string): Promise<void>;
    readManuscript(id: string): Promise<string>;
    writeManuscript(id: string, text: string): Promise<void>;
    listSupportDocs(id: string): Promise<SupportDocSummary[]>;
    createSupportDoc(
        id: string,
        kind: SupportDocKind,
    ): Promise<SupportDocSummary>;
    readSupportDoc(id: string, kind: SupportDocKind): Promise<string>;
    writeSupportDoc(
        id: string,
        kind: SupportDocKind,
        editorHtml: string,
    ): Promise<void>;
    acceptAiDraft(id: string, draftId: string): Promise<string>;
    rejectAiDraft(id: string, draftId: string): Promise<string>;
    insertOrReplaceDraft(
        id: string,
        commentId: string,
        draftHtml: string,
        draftId: string,
    ): Promise<string>;
    beginHighlightRewrite(
        id: string,
        input: BeginHighlightRewriteInput,
    ): Promise<string>;
    getAiProviderStatus(): Promise<AiProviderStatus>;
    connectOpenAiCodex(): Promise<void>;
    disconnectOpenAiCodex(): Promise<void>;
    getOpenAiModelSettings(): Promise<OpenAiModelSettings>;
    setOpenAiModelPreference(preference: string): Promise<OpenAiModelSettings>;
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
    getEditorZoom(): Promise<EditorZoomResult>;
    setEditorZoom(percent: number): Promise<EditorZoomResult>;
    subscribeEditorZoomMenuAction(
        listener: (action: EditorZoomMenuAction) => void,
    ): () => void;
}

export function createShellLabel(): string {
    return "Janus";
}

export { createMockJanusBridge } from "./mock-janus-bridge";
