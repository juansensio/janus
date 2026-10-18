export type AiProviderSession = {
    provider: "openai-codex";
    accessToken: string;
};

export type GenerateDraftInput = {
    manuscriptHtml: string;
    commentId: string;
    commentText: string;
    locale: string;
};

export type GenerateDraftResult = {
    draftHtml: string;
};

export type AiAssistErrorCode =
    | "AI_NOT_SUPPORTED"
    | "AI_NOT_CONNECTED"
    | "AI_COMMENT_NOT_FOUND"
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
    ): Promise<GenerateDraftResult>;
}
