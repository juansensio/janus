import { randomUUID } from "node:crypto";
import { shell } from "electron";
import {
    assertManuscriptContextSize,
    AiAssistError,
    createOpenAiCodexProvider,
    type FetchFn,
} from "@janus/ai-assist";
import {
    insertOrReplaceDraft,
    parseManuscriptBlocks,
} from "@janus/manuscript";
import {
    connectSiwcOpenAi,
    refreshAccessToken,
    revokeRefreshToken,
} from "./ai-oauth";
import { createManuscriptBridgeService } from "./manuscript-service";
import type { ManuscriptBridgeFs } from "./manuscript-service";
import {
    clearAiSession,
    isAccessTokenExpired,
    isDevOverrideSession,
    loadAiSession,
    saveAiSession,
    sessionHasChatGptDirectScope,
    type AnyStoredAiSession,
    type StoredAiSession,
} from "./ai-session-store";

function findCommentText(html: string, commentId: string): string | null {
    const blocks = parseManuscriptBlocks(html);
    const comment = blocks.find(
        (block) => block.kind === "comment" && block.id === commentId,
    );
    return comment?.kind === "comment" ? comment.text : null;
}

export type AiBridgeServiceDeps = {
    fetchImpl?: FetchFn;
    openExternal?: (url: string) => Promise<void>;
    connectSiwc?: typeof connectSiwcOpenAi;
};

async function ensureFreshAccessToken(
    fetchImpl: FetchFn,
    session: StoredAiSession,
): Promise<StoredAiSession> {
    if (!isAccessTokenExpired(session)) {
        return session;
    }
    const refreshed = await refreshAccessToken(fetchImpl, session);
    await saveAiSession(refreshed);
    return refreshed;
}

function accessTokenForSession(
    session: AnyStoredAiSession,
): string {
    if (isDevOverrideSession(session)) {
        return session.accessToken;
    }
    return session.accessToken;
}

export function createAiBridgeService(
    libraryRoot: string,
    fs: ManuscriptBridgeFs,
    deps: AiBridgeServiceDeps = {},
) {
    const manuscript = createManuscriptBridgeService(libraryRoot, fs);
    const fetchImpl = deps.fetchImpl ?? fetch;
    const openExternal =
        deps.openExternal ?? ((url: string) => shell.openExternal(url));
    const connectSiwc = deps.connectSiwc ?? connectSiwcOpenAi;

    const provider = createOpenAiCodexProvider(fetchImpl);

    return {
        async getAiProviderStatus(): Promise<{ connected: boolean }> {
            const session = await loadAiSession();
            return { connected: session !== null };
        },

        async connectOpenAiCodex(): Promise<void> {
            const override = process.env.JANUS_OPENAI_ACCESS_TOKEN?.trim();
            if (override) {
                await saveAiSession({
                    provider: "openai-codex",
                    version: "dev-override",
                    accessToken: override,
                    connectedAt: new Date().toISOString(),
                });
                return;
            }
            await connectSiwc({ fetchImpl, openExternal });
        },

        async disconnectOpenAiCodex(): Promise<void> {
            const session = await loadAiSession();
            if (session && !isDevOverrideSession(session)) {
                await revokeRefreshToken(fetchImpl, session.refreshToken);
            }
            await clearAiSession();
        },

        async writeForComment(
            bookId: string,
            commentId: string,
            locale: string,
        ): Promise<string> {
            let session = await loadAiSession();
            if (!session) {
                throw new AiAssistError(
                    "AI_NOT_CONNECTED",
                    "Connect OpenAI before writing",
                );
            }
            if (!isDevOverrideSession(session)) {
                if (!sessionHasChatGptDirectScope(session)) {
                    throw new AiAssistError(
                        "AI_AUTH_FAILED",
                        "ChatGPT plan usage is not enabled",
                    );
                }
                try {
                    session = await ensureFreshAccessToken(fetchImpl, session);
                } catch (error) {
                    await clearAiSession();
                    throw error;
                }
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
            let accessToken = accessTokenForSession(session);
            try {
                const { draftHtml } = await provider.generateDraft(
                    {
                        provider: "openai-codex",
                        accessToken,
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
            } catch (error) {
                if (
                    error instanceof AiAssistError &&
                    error.code === "AI_AUTH_FAILED" &&
                    !isDevOverrideSession(session)
                ) {
                    const refreshed = await refreshAccessToken(
                        fetchImpl,
                        session as StoredAiSession,
                    );
                    await saveAiSession(refreshed);
                    const { draftHtml } = await provider.generateDraft(
                        {
                            provider: "openai-codex",
                            accessToken: refreshed.accessToken,
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
                }
                throw error;
            }
        },
    };
}
