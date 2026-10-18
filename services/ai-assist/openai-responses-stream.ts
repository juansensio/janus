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

type SseParseState = {
    deltas: string[];
    doneText?: string;
    failureMessage?: string;
};

function accumulatedText(state: SseParseState): string {
    if (state.doneText !== undefined) {
        return state.doneText;
    }
    return state.deltas.join("");
}

function applyStreamEvent(
    event: StreamEvent,
    state: SseParseState,
    onTextDelta?: (accumulated: string) => void,
): void {
    switch (event.type) {
        case "response.output_text.delta":
            if (event.delta) {
                state.deltas.push(event.delta);
                onTextDelta?.(accumulatedText(state));
            }
            break;
        case "response.output_text.done":
            if (event.text) {
                state.doneText = event.text;
                onTextDelta?.(accumulatedText(state));
            }
            break;
        case "response.failed":
            state.failureMessage =
                event.response?.error?.message ??
                event.response?.error?.code ??
                "OpenAI response failed";
            break;
        case "error":
            state.failureMessage =
                event.error?.message ??
                event.error?.code ??
                "OpenAI stream error";
            break;
        default:
            break;
    }
}

function parseSseDataPayload(
    payload: string,
    state: SseParseState,
    onTextDelta?: (accumulated: string) => void,
): void {
    if (!payload || payload === "[DONE]") {
        return;
    }
    let event: StreamEvent;
    try {
        event = JSON.parse(payload) as StreamEvent;
    } catch {
        return;
    }
    applyStreamEvent(event, state, onTextDelta);
}

function processSseLine(
    line: string,
    state: SseParseState,
    onTextDelta?: (accumulated: string) => void,
): void {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
        return;
    }
    const payload = trimmed.slice(5).trim();
    parseSseDataPayload(payload, state, onTextDelta);
}

function finalizeSseState(state: SseParseState): string {
    if (state.failureMessage) {
        throw new AiAssistError("AI_PROVIDER_ERROR", state.failureMessage);
    }
    return accumulatedText(state);
}

export type ResponsesSseFeeder = {
    feed(chunk: string): void;
    finish(): string;
};

export function createResponsesSseFeeder(options?: {
    onTextDelta?: (accumulated: string) => void;
}): ResponsesSseFeeder {
    const state: SseParseState = { deltas: [] };
    let lineBuffer = "";

    return {
        feed(chunk: string) {
            lineBuffer += chunk;
            const lines = lineBuffer.split("\n");
            lineBuffer = lines.pop() ?? "";
            for (const line of lines) {
                processSseLine(line, state, options?.onTextDelta);
            }
        },
        finish() {
            if (lineBuffer.trim()) {
                processSseLine(lineBuffer, state, options?.onTextDelta);
            }
            lineBuffer = "";
            return finalizeSseState(state);
        },
    };
}

export function parseResponsesSse(
    sseText: string,
    options?: { onTextDelta?: (accumulated: string) => void },
): string {
    const feeder = createResponsesSseFeeder(options);
    feeder.feed(sseText);
    return feeder.finish();
}
