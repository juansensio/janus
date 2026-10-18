import { supportedLanguages } from "./registry";

export const FALLBACK_LANGUAGE = "en" as const;

export type LanguageCode = string;

function isRegisteredCode(code: string): boolean {
    return supportedLanguages().includes(code);
}

export function normalize(tag: string | null | undefined): LanguageCode | null {
    if (tag === null || tag === undefined) {
        return null;
    }
    const trimmed = tag.trim();
    if (trimmed.length === 0) {
        return null;
    }
    if (isRegisteredCode(trimmed)) {
        return trimmed;
    }
    const base = trimmed.split(/[-_]/)[0]?.toLowerCase();
    if (base && isRegisteredCode(base)) {
        return base;
    }
    return null;
}

export function resolveUiLocale(
    saved: string | null | undefined,
    system: string | null | undefined,
): LanguageCode {
    return (
        normalize(saved) ?? normalize(system) ?? FALLBACK_LANGUAGE
    );
}

export function assertSupported(code: string): LanguageCode {
    if (!isRegisteredCode(code)) {
        throw Object.assign(new Error("Unsupported language"), {
            code: "UNSUPPORTED_LANGUAGE",
        });
    }
    return code;
}
