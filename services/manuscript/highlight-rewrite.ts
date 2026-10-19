import {
    parseManuscriptBlocks,
    serializeManuscriptBlocks,
    type ManuscriptBlock,
} from "./manuscript-html";
import { ManuscriptServiceError } from "./manuscript-service";

export type HighlightRewriteSpan = {
    /** Index among paragraph-only blocks in document order (0 = first janus-p). */
    blockIndex: number;
    start: number;
    end: number;
};

export type BeginHighlightRewriteInput = {
    commentId: string;
    instruction: string;
    spans: HighlightRewriteSpan[];
};

function invalidSelection(message: string): never {
    throw new ManuscriptServiceError("MANUSCRIPT_INVALID", message);
}

function paragraphIndices(blocks: ManuscriptBlock[]): number[] {
    const indices: number[] = [];
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].kind === "p") {
            indices.push(i);
        }
    }
    return indices;
}

function extractSourceText(
    blocks: ManuscriptBlock[],
    spans: HighlightRewriteSpan[],
): string {
    const pIndices = paragraphIndices(blocks);
    const parts: string[] = [];
    for (const span of spans) {
        if (span.blockIndex < 0 || span.blockIndex >= pIndices.length) {
            invalidSelection("Selection is outside the manuscript");
        }
        const block = blocks[pIndices[span.blockIndex]];
        if (block.kind !== "p") {
            invalidSelection("Selection must be in normal paragraphs");
        }
        const text = block.text;
        if (
            span.start < 0 ||
            span.end > text.length ||
            span.start >= span.end
        ) {
            invalidSelection("Selection range is invalid");
        }
        parts.push(text.slice(span.start, span.end));
    }
    return parts.join("\n\n");
}

function applySpansToBlocks(
    blocks: ManuscriptBlock[],
    spans: HighlightRewriteSpan[],
    commentId: string,
    instruction: string,
    sourceText: string,
): ManuscriptBlock[] {
    const pIndices = paragraphIndices(blocks);
    if (spans.length === 0) {
        invalidSelection("Nothing selected");
    }

    const firstSpan = spans[0];
    const lastSpan = spans[spans.length - 1];
    for (let s = 1; s < spans.length; s++) {
        if (spans[s].blockIndex !== spans[s - 1].blockIndex + 1) {
            invalidSelection("Selection must be contiguous paragraphs");
        }
    }

    const firstBlockIndex = pIndices[firstSpan.blockIndex];
    const lastBlockIndex = pIndices[lastSpan.blockIndex];

    const commentBlock: ManuscriptBlock = {
        kind: "comment",
        id: commentId,
        text: instruction,
        variant: "rewrite",
        source: sourceText,
    };

    const next: ManuscriptBlock[] = [];
    let commentInserted = false;

    for (let i = 0; i < blocks.length; i++) {
        if (i < firstBlockIndex || i > lastBlockIndex) {
            next.push(blocks[i]);
            continue;
        }

        const block = blocks[i];
        if (block.kind !== "p") {
            invalidSelection("Selection must be in normal paragraphs");
        }

        if (i === firstBlockIndex) {
            const before = block.text.slice(0, firstSpan.start);
            if (before.length > 0) {
                next.push({ kind: "p", text: before });
            }
            next.push(commentBlock);
            commentInserted = true;
            if (firstBlockIndex === lastBlockIndex) {
                const after = block.text.slice(lastSpan.end);
                if (after.length > 0) {
                    next.push({ kind: "p", text: after });
                }
            }
            continue;
        }

        if (i > firstBlockIndex && i < lastBlockIndex) {
            continue;
        }

        if (i === lastBlockIndex && firstBlockIndex !== lastBlockIndex) {
            const after = block.text.slice(lastSpan.end);
            if (after.length > 0) {
                next.push({ kind: "p", text: after });
            }
        }
    }

    if (!commentInserted) {
        invalidSelection("Nothing selected");
    }
    return next;
}

export function beginHighlightRewrite(
    html: string,
    input: BeginHighlightRewriteInput,
): string {
    const blocks = [...parseManuscriptBlocks(html)];
    const sourceText = extractSourceText(blocks, input.spans);
    if (!sourceText.trim()) {
        invalidSelection("Selection is empty");
    }
    const next = applySpansToBlocks(
        blocks,
        input.spans,
        input.commentId,
        input.instruction,
        sourceText,
    );
    return serializeManuscriptBlocks(next);
}

export function sourceParagraphsFromRewriteComment(
    source: string,
): string[] {
    if (!source.includes("\n\n")) {
        return [source];
    }
    return source.split("\n\n");
}
