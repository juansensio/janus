import { formatMessage, type UiLanguageResult } from "@janus/bridge";

let currentLocale = "en";
let messages: Record<string, string> = {};

export function initI18n(result: UiLanguageResult): void {
    currentLocale = result.locale;
    messages = result.messages;
    document.documentElement.lang = result.locale;
}

export function getUiLocale(): string {
    return currentLocale;
}

export function t(key: string, vars?: Record<string, string>): string {
    const template = messages[key];
    if (template === undefined) {
        throw new Error(`Missing message: ${key}`);
    }
    return formatMessage(template, vars);
}

/** Returns translated copy when the key exists; otherwise `undefined`. */
export function tOptional(
    key: string,
    vars?: Record<string, string>,
): string | undefined {
    const template = messages[key];
    if (template === undefined) {
        return undefined;
    }
    return formatMessage(template, vars);
}
