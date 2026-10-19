import { normalizeEditorZoomPercent } from "@janus/zoom";

export type JanusSettings = {
    libraryRoot?: string;
    uiLocale?: string;
    /** `"auto"` or an OpenAI model slug from the account catalog */
    openAiModel?: string;
    /** Manuscript page zoom percent (discrete levels only). */
    editorZoomPercent?: number;
};

export function normalizeJanusSettings(raw: unknown): JanusSettings {
    if (raw === null || typeof raw !== "object") {
        return {};
    }
    const record = raw as Record<string, unknown>;
    const settings: JanusSettings = {};
    if (typeof record.libraryRoot === "string") {
        settings.libraryRoot = record.libraryRoot;
    }
    if (typeof record.uiLocale === "string") {
        settings.uiLocale = record.uiLocale;
    }
    if (typeof record.openAiModel === "string") {
        settings.openAiModel = record.openAiModel;
    }
    if (record.editorZoomPercent !== undefined) {
        settings.editorZoomPercent = normalizeEditorZoomPercent(
            record.editorZoomPercent,
        );
    }
    return settings;
}
