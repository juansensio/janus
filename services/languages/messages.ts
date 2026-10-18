import en from "./locales/en.json";
import es from "./locales/es.json";
import { formatMessage } from "./format-message";
import { assertSupported, type LanguageCode } from "./resolve-locale";

const CATALOGS: Record<string, Record<string, string>> = {
    en: en as Record<string, string>,
    es: es as Record<string, string>,
};

function catalogFor(locale: LanguageCode): Record<string, string> {
    const catalog = CATALOGS[locale];
    if (!catalog) {
        throw Object.assign(new Error("Unsupported language"), {
            code: "UNSUPPORTED_LANGUAGE",
        });
    }
    return catalog;
}

export function catalog(locale: string): Record<string, string> {
    return { ...catalogFor(assertSupported(locale)) };
}

export function catalogKeys(locale: string): string[] {
    return Object.keys(catalogFor(assertSupported(locale))).sort();
}

export function message(
    locale: string,
    key: string,
    vars?: Record<string, string>,
): string {
    const resolved = assertSupported(locale);
    const template = catalogFor(resolved)[key];
    if (template === undefined) {
        throw Object.assign(new Error(`Missing message: ${key}`), {
            code: "MISSING_MESSAGE",
        });
    }
    return formatMessage(template, vars);
}
