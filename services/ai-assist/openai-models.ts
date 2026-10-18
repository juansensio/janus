import type { FetchFn } from "./openai-codex-provider";
import { AiAssistError } from "./provider";

type ModelsListResponse = {
    models?: Array<{ slug?: string; visibility?: string }>;
};

export async function fetchListedInferenceModelSlug(
    accessToken: string,
    fetchImpl: FetchFn,
): Promise<string> {
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
    const slug = data.models?.find((m) => m.visibility === "list")?.slug;
    if (!slug) {
        throw new AiAssistError(
            "AI_PROVIDER_ERROR",
            "No inference model available",
        );
    }
    return slug;
}
