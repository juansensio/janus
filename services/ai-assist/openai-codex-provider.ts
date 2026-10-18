import { fetchListedInferenceModelSlug } from "./openai-models";
import {
    createResponsesSseFeeder,
    isResponsesSseBody,
} from "./openai-responses-stream";
import { buildGenerateDraftMessages } from "./prompt";
import {
    AiAssistError,
    type AiProvider,
    type AiProviderSession,
    type GenerateDraftCallbacks,
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

export function wrapDraftHtml(text: string): string {
    const trimmed = text.trim();
    return trimmed.includes("<janus-p>")
        ? trimmed
        : `<janus-p>${trimmed}</janus-p>`;
}

function sseFeederOptions(onDraftHtmlDelta?: (draftHtml: string) => void) {
    return onDraftHtmlDelta
        ? {
              onTextDelta: (text: string) =>
                  onDraftHtmlDelta(wrapDraftHtml(text)),
          }
        : undefined;
}

async function readOpenAiResponseText(
    response: Response,
    contentType: string,
    onDraftHtmlDelta?: (draftHtml: string) => void,
): Promise<string> {
    if (response.body) {
        const feeder = createResponsesSseFeeder(
            sseFeederOptions(onDraftHtmlDelta),
        );
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            feeder.feed(decoder.decode(value, { stream: true }));
        }
        return feeder.finish();
    }

    const raw = await response.text();
    if (isResponsesSseBody(raw, contentType)) {
        const feeder = createResponsesSseFeeder(
            sseFeederOptions(onDraftHtmlDelta),
        );
        feeder.feed(raw);
        return feeder.finish();
    }
    return extractDraftTextFromJson(
        JSON.parse(raw) as {
            output?: Array<{
                content?: Array<{
                    type?: string;
                    text?: string;
                }>;
            }>;
        },
    );
}

export function createOpenAiCodexProvider(fetchImpl: FetchFn = fetch): AiProvider {
    let cachedModelSlug: string | undefined;

    return {
        async generateDraft(
            session: AiProviderSession,
            input: GenerateDraftInput,
            callbacks?: GenerateDraftCallbacks,
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

            const contentType = response.headers.get("content-type") ?? "";
            const text = await readOpenAiResponseText(
                response,
                contentType,
                callbacks?.onDraftHtmlDelta,
            );

            return { draftHtml: wrapDraftHtml(text) };
        },
    };
}
