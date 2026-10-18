import {
    acceptAiDraft as acceptAiDraftHtml,
    createEmptyManuscriptHtml,
    insertOrReplaceDraft as insertOrReplaceDraftHtml,
    rejectAiDraft as rejectAiDraftHtml,
} from "@janus/manuscript";
import type { JanusBridge } from "./index";
import { assertSupported } from "@janus/languages";
import {
    buildUiLanguage,
    buildUiLanguageForCode,
} from "./ui-language";
import { assertEditorZoomPercent } from "@janus/zoom";
import { buildEditorZoomResult } from "./editor-zoom";

const EMPTY_BOOKS: import("./index").BookSummary[] = [];

const defaultBook: import("./index").BookSummary = {
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
    let mockEditorZoomPercent: number | undefined;
    let mockOpenAiModel = "auto";
    const mockOpenAiModelOptions = ["auto", "gpt-4o", "gpt-4.1", "o4-mini"];
    const emptyHtml = createEmptyManuscriptHtml();

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
        readManuscript: async (id) => manuscripts.get(id) ?? emptyHtml,
        writeManuscript: async (id, text) => {
            manuscripts.set(id, text);
        },
        acceptAiDraft: async (id, draftId) => {
            const html = manuscripts.get(id) ?? emptyHtml;
            const next = acceptAiDraftHtml(html, draftId);
            manuscripts.set(id, next);
            return next;
        },
        rejectAiDraft: async (id, draftId) => {
            const html = manuscripts.get(id) ?? emptyHtml;
            const next = rejectAiDraftHtml(html, draftId);
            manuscripts.set(id, next);
            return next;
        },
        insertOrReplaceDraft: async (id, commentId, draftHtml, draftId) => {
            const html = manuscripts.get(id) ?? emptyHtml;
            const next = insertOrReplaceDraftHtml(
                html,
                commentId,
                draftHtml,
                draftId,
            );
            manuscripts.set(id, next);
            return next;
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
        getEditorZoom: async () =>
            buildEditorZoomResult(mockEditorZoomPercent),
        setEditorZoom: async (percent: number) => {
            const valid = assertEditorZoomPercent(percent);
            mockEditorZoomPercent = valid;
            return buildEditorZoomResult(valid);
        },
        getAiProviderStatus: async () => ({ connected: false }),
        connectOpenAiCodex: async () => {
            throw Object.assign(new Error("Not supported in mock"), {
                code: "AI_NOT_SUPPORTED",
            });
        },
        disconnectOpenAiCodex: async () => {},
        getOpenAiModelSettings: async () => ({
            preference: mockOpenAiModel,
            options: mockOpenAiModelOptions,
        }),
        setOpenAiModelPreference: async (preference) => {
            mockOpenAiModel = preference;
            return {
                preference: mockOpenAiModel,
                options: mockOpenAiModelOptions,
            };
        },
        writeForComment: async () => {
            throw Object.assign(new Error("Not supported in mock"), {
                code: "AI_NOT_SUPPORTED",
            });
        },
        ...overrides,
    };
}
