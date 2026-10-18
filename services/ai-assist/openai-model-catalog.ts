export const OPENAI_MODEL_PREFERENCE_AUTO = "auto";

export function normalizeOpenAiModelPreference(raw: unknown): string {
    if (raw === OPENAI_MODEL_PREFERENCE_AUTO) {
        return OPENAI_MODEL_PREFERENCE_AUTO;
    }
    if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (!trimmed || trimmed === OPENAI_MODEL_PREFERENCE_AUTO) {
            return OPENAI_MODEL_PREFERENCE_AUTO;
        }
        return trimmed;
    }
    return OPENAI_MODEL_PREFERENCE_AUTO;
}

/**
 * Selectable values for Settings: Auto plus list-visible slugs from OpenAI when connected.
 * When not connected or the catalog fetch failed, only Auto is available.
 */
export function buildOpenAiModelOptions(
    listedSlugs: string[] | null,
): string[] {
    if (!listedSlugs?.length) {
        return [OPENAI_MODEL_PREFERENCE_AUTO];
    }
    return [OPENAI_MODEL_PREFERENCE_AUTO, ...listedSlugs];
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
