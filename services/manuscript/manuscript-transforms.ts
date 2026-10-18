import {
    parseManuscriptBlocks,
    serializeManuscriptBlocks,
    type ManuscriptBlock,
} from "./manuscript-html";
import { ManuscriptServiceError } from "./manuscript-service";

function draftNotFound(): never {
    throw new ManuscriptServiceError(
        "MANUSCRIPT_DRAFT_NOT_FOUND",
        "Draft not found",
    );
}

function commentNotFound(): never {
    throw new ManuscriptServiceError(
        "MANUSCRIPT_COMMENT_NOT_FOUND",
        "Comment not found",
    );
}

function parseDraftInnerHtml(draftHtml: string): string[] {
    const wrapped = `<janus-manuscript version="1">${draftHtml.trim()}</janus-manuscript>`;
    const blocks = parseManuscriptBlocks(wrapped);
    if (blocks.length === 0) {
        return [""];
    }
    const paragraphs: string[] = [];
    for (const block of blocks) {
        if (block.kind !== "p") {
            throw new ManuscriptServiceError(
                "MANUSCRIPT_INVALID",
                "Draft HTML must contain only janus-p blocks",
            );
        }
        paragraphs.push(block.text);
    }
    return paragraphs;
}

export function acceptAiDraft(html: string, draftId: string): string {
    const blocks = parseManuscriptBlocks(html);
    const draft = blocks.find(
        (block) => block.kind === "draft" && block.id === draftId,
    );
    if (!draft || draft.kind !== "draft") {
        draftNotFound();
    }
    const next: ManuscriptBlock[] = [];
    for (const block of blocks) {
        if (block.kind === "draft" && block.id === draftId) {
            for (const text of draft.paragraphs) {
                next.push({ kind: "p", text });
            }
            continue;
        }
        if (block.kind === "comment" && block.id === draft.commentId) {
            continue;
        }
        next.push(block);
    }
    return serializeManuscriptBlocks(next);
}

export function rejectAiDraft(html: string, draftId: string): string {
    const blocks = parseManuscriptBlocks(html);
    const draftIndex = blocks.findIndex(
        (block) => block.kind === "draft" && block.id === draftId,
    );
    if (draftIndex < 0) {
        return serializeManuscriptBlocks(blocks);
    }
    const next = blocks.filter((_, index) => index !== draftIndex);
    return serializeManuscriptBlocks(next);
}

export function insertOrReplaceDraft(
    html: string,
    commentId: string,
    draftHtml: string,
    draftId: string,
): string {
    const blocks = [...parseManuscriptBlocks(html)];
    const commentIndex = blocks.findIndex(
        (block) => block.kind === "comment" && block.id === commentId,
    );
    if (commentIndex < 0) {
        commentNotFound();
    }
    const paragraphs = parseDraftInnerHtml(draftHtml);
    const existingDraft = blocks.find(
        (block) => block.kind === "draft" && block.commentId === commentId,
    );
    const resolvedDraftId =
        existingDraft?.kind === "draft" ? existingDraft.id : draftId;
    const withoutDrafts = blocks.filter(
        (block) => !(block.kind === "draft" && block.commentId === commentId),
    );
    const nextCommentIndex = withoutDrafts.findIndex(
        (block) => block.kind === "comment" && block.id === commentId,
    );
    const draftBlock: ManuscriptBlock = {
        kind: "draft",
        id: resolvedDraftId,
        commentId,
        paragraphs,
    };
    const next = [
        ...withoutDrafts.slice(0, nextCommentIndex + 1),
        draftBlock,
        ...withoutDrafts.slice(nextCommentIndex + 1),
    ];
    return serializeManuscriptBlocks(next);
}
