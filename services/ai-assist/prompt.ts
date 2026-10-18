import type { GenerateDraftInput } from "./provider";

export function buildGenerateDraftMessages(input: GenerateDraftInput): {
    system: string;
    user: string;
} {
    return {
        system:
            "You write book prose for the author. Return only HTML fragments using <janus-p> paragraphs. No markdown.",
        user: `Locale: ${input.locale}\n\nFull manuscript HTML:\n${input.manuscriptHtml}\n\nAI comment (${input.commentId}):\n${input.commentText}`,
    };
}
