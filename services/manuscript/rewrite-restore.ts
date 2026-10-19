import { sourceParagraphsFromRewriteComment } from "./highlight-rewrite";
import type { ManuscriptBlock } from "./manuscript-html";

/** Replace rewrite comment (and optional linked draft) with restored source paragraphs. */
export function replaceRewriteCommentWithSource(
    blocks: ManuscriptBlock[],
    commentId: string,
    options?: { dropDraftForComment?: boolean },
): ManuscriptBlock[] {
    const commentIndex = blocks.findIndex(
        (block) => block.kind === "comment" && block.id === commentId,
    );
    if (commentIndex < 0) {
        return blocks;
    }
    const comment = blocks[commentIndex];
    if (comment.kind !== "comment") {
        return blocks;
    }
    if (comment.variant !== "rewrite" || !comment.source?.trim()) {
        return blocks;
    }

    const sourceParagraphs = sourceParagraphsFromRewriteComment(
        comment.source,
    );
    const prev =
        commentIndex > 0 && blocks[commentIndex - 1].kind === "p"
            ? blocks[commentIndex - 1]
            : null;
    const next =
        commentIndex < blocks.length - 1 &&
        blocks[commentIndex + 1].kind === "p"
            ? blocks[commentIndex + 1]
            : null;

    let restoredParagraphs: ManuscriptBlock[];
    if (sourceParagraphs.length === 1 && (prev || next)) {
        const merged =
            (prev?.kind === "p" ? prev.text : "") +
            sourceParagraphs[0] +
            (next?.kind === "p" ? next.text : "");
        restoredParagraphs = [{ kind: "p", text: merged }];
    } else {
        restoredParagraphs = sourceParagraphs.map((text) => ({
            kind: "p",
            text,
        }));
    }

    const skipIndices = new Set<number>([commentIndex]);
    if (prev) {
        skipIndices.add(commentIndex - 1);
    }
    if (next) {
        skipIndices.add(commentIndex + 1);
    }

    const nextBlocks: ManuscriptBlock[] = [];
    let inserted = false;
    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (
            options?.dropDraftForComment &&
            block.kind === "draft" &&
            block.commentId === commentId
        ) {
            continue;
        }
        if (skipIndices.has(i)) {
            if (i === commentIndex && !inserted) {
                nextBlocks.push(...restoredParagraphs);
                inserted = true;
            }
            continue;
        }
        nextBlocks.push(block);
    }
    return nextBlocks;
}
