import { randomUUID } from "node:crypto";
import { shell } from "electron";
import type { OpenAiModelSettings } from "@janus/bridge";
import {
    assertManuscriptContextSize,
    AiAssistError,
    buildOpenAiModelOptions,
    createOpenAiCodexProvider,
    fetchListedModelSlugs,
    normalizeOpenAiModelPreference,
    OPENAI_MODEL_PREFERENCE_AUTO,
    resolveWriteModelSlug,
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
import { LibraryBridgeError } from "./library-errors";
import {
    loadJanusSettings,
    saveJanusSettings,
    type LibraryRootFs,
} from "./library-root";

function findComment(
    html: string,
    commentId: string,
): { text: string; model?: string } | null {
    const blocks = parseManuscriptBlocks(html);
    const comment = blocks.find(
        (block) => block.kind === "comment" && block.id === commentId,
    );
    if (comment?.kind !== "comment") {
        return null;
    }
    return { text: comment.text, model: comment.model };
}

export type AiBridgeServiceDeps = {
    fetchImpl?: FetchFn;
    openExternal?: (url: string) => Promise<void>;
    connectSiwc?: typeof connectSiwcOpenAi;
    /** When false, `JANUS_OPENAI_ACCESS_TOKEN` is ignored (packaged desktop builds). */
    allowDevOpenAiTokenOverride?: boolean;
    userDataPath?: string;
    settingsFs?: Pick<LibraryRootFs, "readFile" | "writeFile" | "mkdir">;
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
    const allowDevOpenAiTokenOverride =
        deps.allowDevOpenAiTokenOverride ?? true;
    const userDataPath = deps.userDataPath;
    const settingsFs = deps.settingsFs;

    const provider = createOpenAiCodexProvider(fetchImpl);

    async function resolveOpenAiModelSettings(): Promise<OpenAiModelSettings> {
        if (!userDataPath || !settingsFs) {
            throw new LibraryBridgeError(
                "AI_NOT_SUPPORTED",
                "OpenAI model settings are unavailable",
            );
        }
        const settings = await loadJanusSettings(userDataPath, settingsFs);
        const preference = normalizeOpenAiModelPreference(
            settings.openAiModel,
        );
        const session = await loadAiSession();
        let listedSlugs: string[] | null = null;
        if (session) {
            try {
                let active = session;
                if (!isDevOverrideSession(session)) {
                    active = await ensureFreshAccessToken(
                        fetchImpl,
                        session as StoredAiSession,
                    );
                }
                listedSlugs = await fetchListedModelSlugs(
                    accessTokenForSession(active),
                    fetchImpl,
                );
            } catch {
                listedSlugs = null;
            }
        }
        const options = buildOpenAiModelOptions(listedSlugs);
        const resolvedPreference = options.includes(preference)
            ? preference
            : normalizeOpenAiModelPreference(undefined);
        return { preference: resolvedPreference, options };
    }

    async function providerSessionForWrite(
        accessToken: string,
        commentModel?: string,
    ): Promise<{ provider: "openai-codex"; accessToken: string; model?: string }> {
        let settingsPreference = OPENAI_MODEL_PREFERENCE_AUTO;
        if (userDataPath && settingsFs) {
            const settings = await loadJanusSettings(userDataPath, settingsFs);
            settingsPreference = normalizeOpenAiModelPreference(
                settings.openAiModel,
            );
        }
        const model = resolveWriteModelSlug(commentModel, settingsPreference);
        return model
            ? { provider: "openai-codex", accessToken, model }
            : { provider: "openai-codex", accessToken };
    }

    return {
        async getAiProviderStatus(): Promise<{ connected: boolean }> {
            const session = await loadAiSession();
            return { connected: session !== null };
        },

        async connectOpenAiCodex(): Promise<void> {
            const override = allowDevOpenAiTokenOverride
                ? process.env.JANUS_OPENAI_ACCESS_TOKEN?.trim()
                : undefined;
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

        async getOpenAiModelSettings(): Promise<OpenAiModelSettings> {
            return resolveOpenAiModelSettings();
        },

        async setOpenAiModelPreference(
            preference: string,
        ): Promise<OpenAiModelSettings> {
            if (!userDataPath || !settingsFs) {
                throw new LibraryBridgeError(
                    "AI_NOT_SUPPORTED",
                    "OpenAI model settings are unavailable",
                );
            }
            const current = await resolveOpenAiModelSettings();
            if (!current.options.includes(preference)) {
                throw new LibraryBridgeError(
                    "AI_PROVIDER_ERROR",
                    "Unknown OpenAI model preference",
                );
            }
            const settings = await loadJanusSettings(userDataPath, settingsFs);
            await saveJanusSettings(
                userDataPath,
                { ...settings, openAiModel: preference },
                settingsFs,
            );
            return resolveOpenAiModelSettings();
        },

        async writeForComment(
            bookId: string,
            commentId: string,
            locale: string,
            options?: { onDraftDelta?: (draftHtml: string) => void },
        ): Promise<string> {
            try {
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
                        session = await ensureFreshAccessToken(
                            fetchImpl,
                            session,
                        );
                    } catch (error) {
                        await clearAiSession();
                        throw error;
                    }
                }
                const html = await manuscript.readManuscript(bookId);
                const comment = findComment(html, commentId);
                if (comment === null) {
                    throw new AiAssistError(
                        "AI_COMMENT_NOT_FOUND",
                        "AI comment not found",
                    );
                }
                const commentText = comment.text;
                assertManuscriptContextSize(html);
                const accessToken = accessTokenForSession(session);
                const draftId = randomUUID();
                const providerSession = await providerSessionForWrite(
                    accessToken,
                    comment.model,
                );
                try {
                    const { draftHtml } = await provider.generateDraft(
                        providerSession,
                        {
                            manuscriptHtml: html,
                            commentId,
                            commentText,
                            locale,
                        },
                        {
                            onDraftHtmlDelta: options?.onDraftDelta,
                        },
                    );
                    const next = insertOrReplaceDraft(
                        html,
                        commentId,
                        draftHtml,
                        draftId,
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
                        const retrySession = await providerSessionForWrite(
                            refreshed.accessToken,
                            comment.model,
                        );
                        const { draftHtml } = await provider.generateDraft(
                            retrySession,
                            {
                                manuscriptHtml: html,
                                commentId,
                                commentText,
                                locale,
                            },
                            {
                                onDraftHtmlDelta: options?.onDraftDelta,
                            },
                        );
                        const next = insertOrReplaceDraft(
                            html,
                            commentId,
                            draftHtml,
                            draftId,
                        );
                        await manuscript.writeManuscript(bookId, next);
                        return next;
                    }
                    throw error;
                }
            } catch (error) {
                if (error instanceof AiAssistError) {
                    throw error;
                }
                throw new AiAssistError(
                    "AI_PROVIDER_ERROR",
                    error instanceof Error ? error.message : "Write failed",
                );
            }
        },
    };
}
