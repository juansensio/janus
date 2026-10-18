export const OPENAI_MODEL_PREFERENCE_AUTO = "auto";

/** Curated slugs; intersect with account catalog when connected. */
export const JANUS_OPENAI_MODEL_ALLOWLIST = [
    "gpt-4o",
    "gpt-4.1",
    "o4-mini",
] as const;

export type JanusOpenAiAllowlistedSlug =
    (typeof JANUS_OPENAI_MODEL_ALLOWLIST)[number];

export function normalizeOpenAiModelPreference(
    raw: unknown,
): typeof OPENAI_MODEL_PREFERENCE_AUTO | JanusOpenAiAllowlistedSlug {
    if (raw === OPENAI_MODEL_PREFERENCE_AUTO) {
        return OPENAI_MODEL_PREFERENCE_AUTO;
    }
    if (
        typeof raw === "string" &&
        (JANUS_OPENAI_MODEL_ALLOWLIST as readonly string[]).includes(raw)
    ) {
        return raw as JanusOpenAiAllowlistedSlug;
    }
    return OPENAI_MODEL_PREFERENCE_AUTO;
}

export function isAllowedOpenAiModelPreference(
    value: string,
): value is typeof OPENAI_MODEL_PREFERENCE_AUTO | JanusOpenAiAllowlistedSlug {
    return (
        value === OPENAI_MODEL_PREFERENCE_AUTO ||
        (JANUS_OPENAI_MODEL_ALLOWLIST as readonly string[]).includes(value)
    );
}

/**
 * Selectable values for Settings: Auto plus allowlisted slugs available on the account.
 * When `listedSlugs` is null (not connected), returns Auto + full allowlist for offline labels.
 */
export function buildOpenAiModelOptions(
    listedSlugs: string[] | null,
): string[] {
    const auto = [OPENAI_MODEL_PREFERENCE_AUTO];
    if (listedSlugs === null) {
        return [...auto, ...JANUS_OPENAI_MODEL_ALLOWLIST];
    }
    const available = JANUS_OPENAI_MODEL_ALLOWLIST.filter((slug) =>
        listedSlugs.includes(slug),
    );
    return [...auto, ...available];
}

export function resolveProviderModelSlug(
    preference: string,
): string | undefined {
    if (preference === OPENAI_MODEL_PREFERENCE_AUTO) {
        return undefined;
    }
    return preference;
}

/** Comment-level model empty → use settings preference. */
export function resolveWriteModelSlug(
    commentModel: string | undefined | null,
    settingsPreference: string,
): string | undefined {
    const trimmed = commentModel?.trim();
    const preference = trimmed
        ? normalizeOpenAiModelPreference(trimmed)
        : normalizeOpenAiModelPreference(settingsPreference);
    return resolveProviderModelSlug(preference);
}
