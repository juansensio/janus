import type { GenerateDraftInput } from "./provider";
import { WRITE_CONTEXT_MARK, buildWriteContext } from "./write-context";

export function buildGenerateDraftMessages(input: GenerateDraftInput): {
    system: string;
    user: string;
} {
    const prose = buildWriteContext(input.manuscriptHtml, input.commentId);
    return {
        system: [
            "You help the author write book prose.",
            "The user message contains the book as plain prose with a <<<WRITE>>> mark where new or changed prose should go.",
            "When an original passage is provided, rewrite that passage according to the instruction.",
            "The instruction is separate from the prose.",
            "Respond with JSON only, no markdown fences.",
            'Draft: {"kind":"draft","paragraphs":["plain text paragraph",...]} — paragraphs in the manuscript language.',
            `Refusal: {"kind":"refusal","message":"..."} — one short sentence in locale "${input.locale}" when the instruction is not a request to add or change prose.`,
        ].join(" "),
        user: [
            `Locale: ${input.locale}`,
            "",
            "Book prose:",
            prose,
            "",
            ...(input.rewriteSourceText?.trim()
                ? [
                      "Original passage to rewrite:",
                      input.rewriteSourceText.trim(),
                      "",
                  ]
                : []),
            `Instruction (at ${WRITE_CONTEXT_MARK}):`,
            input.commentText,
        ].join("\n"),
    };
}
