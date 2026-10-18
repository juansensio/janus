import { parseManuscriptBlocks } from "@janus/manuscript";
import { AiAssistError } from "./provider";

export const WRITE_CONTEXT_MARK = "<<<WRITE>>>";

export function buildWriteContext(
    manuscriptHtml: string,
    commentId: string,
): string {
    const blocks = parseManuscriptBlocks(manuscriptHtml);
    let found = false;
    const paragraphs: string[] = [];

    for (const block of blocks) {
        if (block.kind === "p") {
            paragraphs.push(block.text);
            continue;
        }
        if (block.kind === "draft") {
            continue;
        }
        if (block.kind === "comment") {
            if (block.id === commentId) {
                paragraphs.push(WRITE_CONTEXT_MARK);
                found = true;
            }
        }
    }

    if (!found) {
        throw new AiAssistError(
            "AI_COMMENT_NOT_FOUND",
            "AI comment not found",
        );
    }

    return paragraphs.join("\n\n");
}
