import type { FetchFn } from "./openai-codex-provider";
import { AiAssistError } from "./provider";

type ModelsListResponse = {
    models?: Array<{ slug?: string; visibility?: string }>;
};

export async function fetchListedModelSlugs(
    accessToken: string,
    fetchImpl: FetchFn,
): Promise<string[]> {
    const response = await fetchImpl("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 401 || response.status === 403) {
        throw new AiAssistError(
            "AI_AUTH_FAILED",
            "OpenAI authentication failed",
        );
    }
    if (!response.ok) {
        throw new AiAssistError(
            "AI_PROVIDER_ERROR",
            "OpenAI models request failed",
        );
    }
    const data = (await response.json()) as ModelsListResponse;
    return (
        data.models
            ?.filter((m) => m.visibility === "list" && typeof m.slug === "string")
            .map((m) => m.slug as string) ?? []
    );
}

export async function fetchListedInferenceModelSlug(
    accessToken: string,
    fetchImpl: FetchFn,
): Promise<string> {
    const slugs = await fetchListedModelSlugs(accessToken, fetchImpl);
    const slug = slugs[0];
    if (!slug) {
        throw new AiAssistError(
            "AI_PROVIDER_ERROR",
            "No inference model available",
        );
    }
    return slug;
}
