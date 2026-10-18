import { buildGenerateDraftMessages } from "./prompt";
import {
    AiAssistError,
    type AiProvider,
    type AiProviderSession,
    type GenerateDraftInput,
    type GenerateDraftResult,
} from "./provider";

export type FetchFn = typeof fetch;

export function createOpenAiCodexProvider(fetchImpl: FetchFn = fetch): AiProvider {
    return {
        async generateDraft(
            session: AiProviderSession,
            input: GenerateDraftInput,
        ): Promise<GenerateDraftResult> {
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
                        model: "gpt-4.1-mini",
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
                        stream: false,
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
            const data = (await response.json()) as {
                output?: Array<{
                    type?: string;
                    content?: Array<{ type?: string; text?: string }>;
                }>;
            };
            const text =
                data.output
                    ?.flatMap((item) => item.content ?? [])
                    .find((part) => part.type === "output_text")?.text ?? "";
            const draftHtml = text.includes("<janus-p>")
                ? text.trim()
                : `<janus-p>${text.trim()}</janus-p>`;
            return { draftHtml };
        },
    };
}
