import { AiAssistError } from "./provider";

export const MAX_MANUSCRIPT_HTML_BYTES = 512 * 1024;

export function assertManuscriptContextSize(manuscriptHtml: string): void {
    const bytes = new TextEncoder().encode(manuscriptHtml).byteLength;
    if (bytes > MAX_MANUSCRIPT_HTML_BYTES) {
        throw new AiAssistError(
            "AI_CONTEXT_TOO_LARGE",
            "Manuscript is too large for AI context",
        );
    }
}
