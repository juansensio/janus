import type { UiLanguageResult } from "@janus/bridge";

let currentLocale = "en";
let messages: Record<string, string> = {};

function interpolate(
    template: string,
    vars?: Record<string, string>,
): string {
    if (!vars) {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
        const value = vars[key];
        return value === undefined ? match : value;
    });
}

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
    return interpolate(template, vars);
}
