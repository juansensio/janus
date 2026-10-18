export type JanusSettings = {
    libraryRoot?: string;
    uiLocale?: string;
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
    return settings;
}
