import { fetchListedInferenceModelSlug } from "./openai-models";
import {
    isResponsesSseBody,
    parseResponsesSse,
} from "./openai-responses-stream";
import { buildGenerateDraftMessages } from "./prompt";
import {
    AiAssistError,
    type AiProvider,
    type AiProviderSession,
    type GenerateDraftInput,
    type GenerateDraftResult,
} from "./provider";

export type FetchFn = typeof fetch;

function extractDraftTextFromJson(data: {
    output?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
    }>;
}): string {
    return (
        data.output
            ?.flatMap((item) => item.content ?? [])
            .find((part) => part.type === "output_text")?.text ?? ""
    );
}

function wrapDraftHtml(text: string): string {
    const trimmed = text.trim();
    return trimmed.includes("<janus-p>")
        ? trimmed
        : `<janus-p>${trimmed}</janus-p>`;
}

export function createOpenAiCodexProvider(fetchImpl: FetchFn = fetch): AiProvider {
    let cachedModelSlug: string | undefined;

    return {
        async generateDraft(
            session: AiProviderSession,
            input: GenerateDraftInput,
        ): Promise<GenerateDraftResult> {
            const model =
                session.model ??
                cachedModelSlug ??
                (cachedModelSlug = await fetchListedInferenceModelSlug(
                    session.accessToken,
                    fetchImpl,
                ));

            const messages = buildGenerateDraftMessages(input);
            const response = await fetchImpl(
                "https://api.openai.com/v1/responses",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model,
                        input: [
                            {
                                role: "system",
                                content: messages.system,
                            },
                            {
                                role: "user",
                                content: messages.user,
                            },
                        ],
                        store: false,
                        stream: true,
                    }),
                },
            );
            if (response.status === 401 || response.status === 403) {
                throw new AiAssistError(
                    "AI_AUTH_FAILED",
                    "OpenAI authentication failed",
                );
            }
            if (!response.ok) {
                throw new AiAssistError(
                    "AI_PROVIDER_ERROR",
                    "OpenAI request failed",
                );
            }

            const raw = await response.text();
            const contentType = response.headers.get("content-type") ?? "";
            const text = isResponsesSseBody(raw, contentType)
                ? parseResponsesSse(raw)
                : extractDraftTextFromJson(
                      JSON.parse(raw) as {
                          output?: Array<{
                              content?: Array<{
                                  type?: string;
                                  text?: string;
                              }>;
                          }>;
                      },
                  );

            return { draftHtml: wrapDraftHtml(text) };
        },
    };
}
