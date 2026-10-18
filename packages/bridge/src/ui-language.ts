import {
    assertSupported,
    catalog,
    registeredLanguages,
    resolveUiLocale,
    type LanguageDefinition,
} from "@janus/languages";

export type UiLanguageResult = {
    locale: string;
    messages: Record<string, string>;
    languages: readonly LanguageDefinition[];
};

export function buildUiLanguage(
    savedLocale: string | null | undefined,
    systemLocale: string | null | undefined,
): UiLanguageResult {
    const locale = resolveUiLocale(savedLocale, systemLocale);
    return {
        locale,
        messages: catalog(locale),
        languages: registeredLanguages(),
    };
}

export function buildUiLanguageForCode(code: string): UiLanguageResult {
    const locale = assertSupported(code);
    return {
        locale,
        messages: catalog(locale),
        languages: registeredLanguages(),
    };
}
