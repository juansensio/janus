import type { JanusBridge } from "@janus/bridge";
import {
    buildEditorZoomResult,
    buildUiLanguage,
    buildUiLanguageForCode,
} from "@janus/bridge";
import { assertEditorZoomPercent } from "@janus/zoom";
import { assertSupported } from "@janus/languages";
import { createShelfService } from "@janus/library";
import { loadJanusSettings, saveJanusSettings } from "./janus-settings";
import { createCapacitorShelfFs } from "./library-fs";
import { createCapacitorManuscriptFs } from "./manuscript-fs";
import { createManuscriptBridgeService } from "./manuscript-service";

declare global {
    interface Window {
        janus?: JanusBridge;
    }
}

const MOBILE_LIBRARY_ROOT = "library";

const shelfFs = createCapacitorShelfFs();
const shelfService = createShelfService(MOBILE_LIBRARY_ROOT, shelfFs);
const manuscriptFs = createCapacitorManuscriptFs();
const manuscriptService = createManuscriptBridgeService(
    MOBILE_LIBRARY_ROOT,
    manuscriptFs,
);

export function installMobileBridge(): void {
    const bridge: JanusBridge = {
        platform: () => "mobile",
        listBooks: () => shelfService.listBooks(),
        suggestNewBookTitle: () => shelfService.suggestNewBookTitle(),
        createBook: (title) => shelfService.createBook(title),
        renameBook: (id, title) => shelfService.renameBook(id, title),
        deleteBook: (id) => shelfService.deleteBook(id),
        readManuscript: (id) => manuscriptService.readManuscript(id),
        writeManuscript: (id, text) =>
            manuscriptService.writeManuscript(id, text),
        acceptAiDraft: (id, draftId) =>
            manuscriptService.acceptAiDraft(id, draftId),
        rejectAiDraft: (id, draftId) =>
            manuscriptService.rejectAiDraft(id, draftId),
        insertOrReplaceDraft: (id, commentId, draftHtml, draftId) =>
            manuscriptService.insertOrReplaceDraft(
                id,
                commentId,
                draftHtml,
                draftId,
            ),
        getAiProviderStatus: async () => ({ connected: false }),
        connectOpenAiCodex: async () => {
            throw Object.assign(new Error("AI is not supported on mobile"), {
                code: "AI_NOT_SUPPORTED",
            });
        },
        disconnectOpenAiCodex: async () => {
            throw Object.assign(new Error("AI is not supported on mobile"), {
                code: "AI_NOT_SUPPORTED",
            });
        },
        getOpenAiModelSettings: async () => {
            throw Object.assign(new Error("AI is not supported on mobile"), {
                code: "AI_NOT_SUPPORTED",
            });
        },
        setOpenAiModelPreference: async () => {
            throw Object.assign(new Error("AI is not supported on mobile"), {
                code: "AI_NOT_SUPPORTED",
            });
        },
        writeForComment: async () => {
            throw Object.assign(new Error("AI is not supported on mobile"), {
                code: "AI_NOT_SUPPORTED",
            });
        },
        getLibraryRoot: async () => ({
            path: MOBILE_LIBRARY_ROOT,
            source: "user-data",
        }),
        chooseLibraryRoot: async () => {
            throw Object.assign(
                new Error("Choosing a library folder is not supported on mobile"),
                { code: "LIBRARY_ROOT_NOT_SUPPORTED" },
            );
        },
        getUiLanguage: async () => {
            const settings = await loadJanusSettings();
            return buildUiLanguage(
                settings.uiLocale,
                typeof navigator !== "undefined" ? navigator.language : "en",
            );
        },
        setUiLanguage: async (code: string) => {
            assertSupported(code);
            const settings = await loadJanusSettings();
            await saveJanusSettings({ ...settings, uiLocale: code });
            return buildUiLanguageForCode(code);
        },
        getEditorZoom: async () => {
            const settings = await loadJanusSettings();
            return buildEditorZoomResult(settings.editorZoomPercent);
        },
        setEditorZoom: async (percent: number) => {
            const valid = assertEditorZoomPercent(percent);
            const settings = await loadJanusSettings();
            await saveJanusSettings({
                ...settings,
                editorZoomPercent: valid,
            });
            return buildEditorZoomResult(valid);
        },
    };
    window.janus = bridge;
}
