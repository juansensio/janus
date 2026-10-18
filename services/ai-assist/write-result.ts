import { AiAssistError } from "./provider";

export type WriteResult =
    | { kind: "draft"; paragraphs: string[] }
    | { kind: "refusal"; message: string };

function invalidWriteResult(): never {
    throw new AiAssistError("AI_PROVIDER_ERROR", "Invalid write result");
}

export function parseWriteResult(raw: string): WriteResult {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        invalidWriteResult();
    }

    let jsonText = trimmed;
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) {
        jsonText = fenced[1].trim();
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        invalidWriteResult();
    }

    if (!parsed || typeof parsed !== "object") {
        invalidWriteResult();
    }

    const record = parsed as Record<string, unknown>;
    const kind = record.kind;
    if (kind === "draft") {
        const paragraphs = record.paragraphs;
        if (
            !Array.isArray(paragraphs) ||
            paragraphs.length === 0 ||
            paragraphs.some((p) => typeof p !== "string")
        ) {
            invalidWriteResult();
        }
        return { kind: "draft", paragraphs };
    }

    if (kind === "refusal") {
        const message = record.message;
        if (typeof message !== "string") {
            invalidWriteResult();
        }
        return { kind: "refusal", message };
    }

    invalidWriteResult();
}

export function draftParagraphsToHtml(paragraphs: string[]): string {
    return paragraphs.map((text) => `<janus-p>${text}</janus-p>`).join("");
}
