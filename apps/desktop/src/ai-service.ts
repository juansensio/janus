import { randomUUID } from "node:crypto";
import {
    assertManuscriptContextSize,
    AiAssistError,
    createOpenAiCodexProvider,
} from "@janus/ai-assist";
import {
    insertOrReplaceDraft,
    parseManuscriptBlocks,
} from "@janus/manuscript";
import { createManuscriptBridgeService } from "./manuscript-service";
import type { ManuscriptBridgeFs } from "./manuscript-service";
import {
    clearAiSession,
    loadAiSession,
    saveAiSession,
    type StoredAiSession,
} from "./ai-session-store";

function findCommentText(html: string, commentId: string): string | null {
    const blocks = parseManuscriptBlocks(html);
    const comment = blocks.find(
        (block) => block.kind === "comment" && block.id === commentId,
    );
    return comment?.kind === "comment" ? comment.text : null;
}

export function createAiBridgeService(
    libraryRoot: string,
    fs: ManuscriptBridgeFs,
) {
    const manuscript = createManuscriptBridgeService(libraryRoot, fs);
    const provider = createOpenAiCodexProvider();

    return {
        async getAiProviderStatus(): Promise<{ connected: boolean }> {
            const session = await loadAiSession();
            return { connected: session !== null };
        },

        async connectOpenAiCodex(): Promise<void> {
            const token = process.env.JANUS_OPENAI_ACCESS_TOKEN?.trim();
            if (!token) {
                throw new AiAssistError(
                    "AI_AUTH_FAILED",
                    "Set JANUS_OPENAI_ACCESS_TOKEN for development Connect",
                );
            }
            const session: StoredAiSession = {
                provider: "openai-codex",
                accessToken: token,
                connectedAt: new Date().toISOString(),
            };
            await saveAiSession(session);
        },

        async disconnectOpenAiCodex(): Promise<void> {
            await clearAiSession();
        },

        async writeForComment(
            bookId: string,
            commentId: string,
            locale: string,
        ): Promise<string> {
            const session = await loadAiSession();
            if (!session) {
                throw new AiAssistError(
                    "AI_NOT_CONNECTED",
                    "Connect OpenAI before writing",
                );
            }
            const html = await manuscript.readManuscript(bookId);
            const commentText = findCommentText(html, commentId);
            if (commentText === null) {
                throw new AiAssistError(
                    "AI_COMMENT_NOT_FOUND",
                    "AI comment not found",
                );
            }
            assertManuscriptContextSize(html);
            const { draftHtml } = await provider.generateDraft(
                {
                    provider: "openai-codex",
                    accessToken: session.accessToken,
                },
                {
                    manuscriptHtml: html,
                    commentId,
                    commentText,
                    locale,
                },
            );
            const next = insertOrReplaceDraft(
                html,
                commentId,
                draftHtml,
                randomUUID(),
            );
            await manuscript.writeManuscript(bookId, next);
            return next;
        },
    };
}
