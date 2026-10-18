import { AiAssistError } from "./provider";

/** True when the HTTP body is OpenAI Responses SSE (not a JSON object). */
export function isResponsesSseBody(raw: string, contentType: string): boolean {
    if (contentType.toLowerCase().includes("text/event-stream")) {
        return true;
    }
    const start = raw.trimStart();
    return start.startsWith("data:") || start.startsWith("event:");
}

type StreamEvent = {
    type?: string;
    delta?: string;
    text?: string;
    response?: { error?: { code?: string; message?: string } };
    error?: { code?: string; message?: string };
};

export function parseResponsesSse(sseText: string): string {
    const deltas: string[] = [];
    let doneText: string | undefined;
    let failureMessage: string | undefined;

    for (const line of sseText.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) {
            continue;
        }
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") {
            continue;
        }
        let event: StreamEvent;
        try {
            event = JSON.parse(payload) as StreamEvent;
        } catch {
            continue;
        }
        switch (event.type) {
            case "response.output_text.delta":
                if (event.delta) {
                    deltas.push(event.delta);
                }
                break;
            case "response.output_text.done":
                if (event.text) {
                    doneText = event.text;
                }
                break;
            case "response.failed":
                failureMessage =
                    event.response?.error?.message ??
                    event.response?.error?.code ??
                    "OpenAI response failed";
                break;
            case "error":
                failureMessage =
                    event.error?.message ??
                    event.error?.code ??
                    "OpenAI stream error";
                break;
            default:
                break;
        }
    }

    if (failureMessage) {
        throw new AiAssistError("AI_PROVIDER_ERROR", failureMessage);
    }

    if (doneText !== undefined) {
        return doneText;
    }
    return deltas.join("");
}
