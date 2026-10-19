export type AiProviderSession = {
    provider: "openai-codex";
    accessToken: string;
    /** Account-specific slug from GET /v1/models; resolved automatically when omitted */
    model?: string;
};

export type GenerateDraftInput = {
    manuscriptHtml: string;
    commentId: string;
    commentText: string;
    locale: string;
    rewriteSourceText?: string;
};

export type GenerateDraftResult = {
    draftHtml: string;
};

export type GenerateDraftCallbacks = {
    /** Called as provider text accumulates; argument is draft HTML (janus-p wrapped). */
    onDraftHtmlDelta?: (draftHtml: string) => void;
};

export type AiAssistErrorCode =
    | "AI_NOT_SUPPORTED"
    | "AI_NOT_CONNECTED"
    | "AI_COMMENT_NOT_FOUND"
    | "AI_COMMENT_NOT_INSTRUCTION"
    | "AI_CONTEXT_TOO_LARGE"
    | "AI_PROVIDER_ERROR"
    | "AI_AUTH_FAILED"
    | "AI_AUTH_CANCELLED";

export class AiAssistError extends Error {
    readonly code: AiAssistErrorCode;

    constructor(code: AiAssistErrorCode, message: string) {
        super(message);
        this.name = "AiAssistError";
        this.code = code;
    }
}

export interface AiProvider {
    generateDraft(
        session: AiProviderSession,
        input: GenerateDraftInput,
        callbacks?: GenerateDraftCallbacks,
    ): Promise<GenerateDraftResult>;
}
