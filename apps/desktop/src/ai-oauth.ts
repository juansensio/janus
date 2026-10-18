import { createHash, randomBytes } from "node:crypto";
import http from "node:http";
import { URL, URLSearchParams } from "node:url";
import { AiAssistError, type FetchFn } from "@janus/ai-assist";
import {
    buildStoredSessionFromTokenResponse,
    loadOrCreateExtAgentHostId,
    loadAiSession,
    saveAiSession,
    type StoredAiSession,
} from "./ai-session-store";

export const SIWC_AUTHORIZE_URL =
    "https://auth.openai.com/api/accounts/authorize";
export const SIWC_TOKEN_URL = "https://auth.openai.com/api/accounts/oauth/token";
export const SIWC_OPENID_CONFIGURATION_URL =
    "https://auth.openai.com/.well-known/openid-configuration";
export const SIWC_RESOURCE = "https://api.openai.com/v1";
export const SIWC_AGENT_NAME_HINT = "Janus";
export const SIWC_DYNAMIC_CLIENT_ID = "dynamic_agent_client";
export const SIWC_CALLBACK_PATH = "/auth/callback";

const SIWC_SCOPES =
    "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";

export type PkcePair = {
    verifier: string;
    challenge: string;
};

export function createPkcePair(): PkcePair {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256")
        .update(verifier)
        .digest("base64url");
    return { verifier, challenge };
}

export function createOAuthState(): string {
    return randomBytes(16).toString("base64url");
}

export function createOAuthNonce(): string {
    return randomBytes(16).toString("base64url");
}

export function buildRedirectUri(port: number): string {
    return `http://127.0.0.1:${port}${SIWC_CALLBACK_PATH}`;
}

export type AuthorizeUrlInput = {
    clientId: string;
    redirectUri: string;
    state: string;
    nonce: string;
    codeChallenge: string;
    extAgentHostId: string;
    isFirstRegistration: boolean;
    idTokenHint?: string;
    loginHint?: string;
};

export function buildAuthorizeUrl(input: AuthorizeUrlInput): string {
    const params = new URLSearchParams({
        client_id: input.clientId,
        response_type: "code",
        redirect_uri: input.redirectUri,
        scope: SIWC_SCOPES,
        resource: SIWC_RESOURCE,
        state: input.state,
        nonce: input.nonce,
        code_challenge_method: "S256",
        code_challenge: input.codeChallenge,
        ext_agent_host_id: input.extAgentHostId,
    });
    if (input.isFirstRegistration) {
        params.set("agent_name_hint", SIWC_AGENT_NAME_HINT);
    }
    if (input.idTokenHint) {
        params.set("id_token_hint", input.idTokenHint);
    }
    if (input.loginHint) {
        params.set("login_hint", input.loginHint);
    }
    return `${SIWC_AUTHORIZE_URL}?${params.toString()}`;
}

export type OAuthCallbackResult = {
    code: string;
    issuedClientId?: string;
};

export function parseOAuthCallbackQuery(
    query: URLSearchParams,
    expectedState: string,
): OAuthCallbackResult {
    const error = query.get("error");
    if (error === "access_denied") {
        throw new AiAssistError("AI_AUTH_CANCELLED", "Sign-in was cancelled");
    }
    if (error) {
        throw new AiAssistError(
            "AI_AUTH_FAILED",
            `Sign-in failed: ${error}`,
        );
    }
    const state = query.get("state");
    if (!state || state !== expectedState) {
        throw new AiAssistError("AI_AUTH_FAILED", "Invalid OAuth state");
    }
    const code = query.get("code");
    if (!code) {
        throw new AiAssistError("AI_AUTH_FAILED", "Missing authorization code");
    }
    const issuedClientId = query.get("client_id") ?? undefined;
    return { code, issuedClientId };
}

export type TokenResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
    id_token?: string;
    token_type?: string;
};

export async function exchangeAuthorizationCode(
    fetchImpl: FetchFn,
    input: {
        clientId: string;
        code: string;
        codeVerifier: string;
        redirectUri: string;
    },
): Promise<TokenResponse> {
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: input.clientId,
        code: input.code,
        code_verifier: input.codeVerifier,
        redirect_uri: input.redirectUri,
        resource: SIWC_RESOURCE,
    });
    const response = await fetchImpl(SIWC_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    if (!response.ok) {
        throw new AiAssistError(
            "AI_AUTH_FAILED",
            "Could not complete sign-in",
        );
    }
    return (await response.json()) as TokenResponse;
}

export async function refreshAccessToken(
    fetchImpl: FetchFn,
    session: StoredAiSession,
): Promise<StoredAiSession> {
    const body = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: session.clientId,
        refresh_token: session.refreshToken,
        resource: SIWC_RESOURCE,
    });
    const response = await fetchImpl(SIWC_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });
    if (!response.ok) {
        throw new AiAssistError("AI_AUTH_FAILED", "Session expired");
    }
    const token = (await response.json()) as TokenResponse;
    const next = buildStoredSessionFromTokenResponse({
        clientId: session.clientId,
        extAgentHostId: session.extAgentHostId,
        tokenResponse: token,
        email: session.email,
        subject: session.subject,
    });
    next.idToken = token.id_token ?? session.idToken;
    next.connectedAt = session.connectedAt;
    return next;
}

export async function revokeRefreshToken(
    fetchImpl: FetchFn,
    refreshToken: string,
): Promise<void> {
    try {
        const configResponse = await fetchImpl(SIWC_OPENID_CONFIGURATION_URL);
        if (!configResponse.ok) {
            return;
        }
        const config = (await configResponse.json()) as {
            revocation_endpoint?: string;
        };
        const endpoint = config.revocation_endpoint;
        if (!endpoint) {
            return;
        }
        const body = new URLSearchParams({
            token: refreshToken,
            token_type_hint: "refresh_token",
        });
        await fetchImpl(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
        });
    } catch {
        // Best-effort revoke; local credentials are cleared either way.
    }
}

export type WaitForCallbackOptions = {
    port?: number;
    timeoutMs?: number;
    onListening?: (redirectUri: string) => void;
};

export function waitForOAuthCallback(
    expectedState: string,
    options: WaitForCallbackOptions = {},
): Promise<{ result: OAuthCallbackResult; redirectUri: string }> {
    const timeoutMs = options.timeoutMs ?? 5 * 60_000;
    return new Promise((resolve, reject) => {
        let boundPort = 0;
        const server = http.createServer((req, res) => {
            if (!req.url?.startsWith(SIWC_CALLBACK_PATH)) {
                res.writeHead(404);
                res.end();
                return;
            }
            const url = new URL(req.url, "http://127.0.0.1");
            try {
                const result = parseOAuthCallbackQuery(
                    url.searchParams,
                    expectedState,
                );
                res.writeHead(200, {
                    "Content-Type": "text/html; charset=utf-8",
                });
                res.end(
                    "<!DOCTYPE html><html><body><p>Sign-in complete. You can close this tab and return to Janus.</p></body></html>",
                );
                clearTimeout(timer);
                server.close();
                resolve({
                    result,
                    redirectUri: buildRedirectUri(boundPort),
                });
            } catch (error) {
                res.writeHead(400);
                res.end("Sign-in failed");
                clearTimeout(timer);
                server.close();
                reject(error);
            }
        });

        const timer = setTimeout(() => {
            server.close();
            reject(
                new AiAssistError("AI_AUTH_CANCELLED", "Sign-in timed out"),
            );
        }, timeoutMs);

        server.on("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });

        server.listen(options.port ?? 0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                clearTimeout(timer);
                server.close();
                reject(new Error("Could not bind loopback server"));
                return;
            }
            boundPort = address.port;
            options.onListening?.(buildRedirectUri(boundPort));
        });
    });
}

function parseIdTokenClaims(idToken: string): {
    sub?: string;
    email?: string;
} {
    const parts = idToken.split(".");
    if (parts.length < 2) {
        return {};
    }
    try {
        const json = Buffer.from(parts[1], "base64url").toString("utf8");
        const payload = JSON.parse(json) as { sub?: string; email?: string };
        return { sub: payload.sub, email: payload.email };
    } catch {
        return {};
    }
}

export type SiwcConnectDeps = {
    fetchImpl: FetchFn;
    openExternal: (url: string) => Promise<void>;
    waitForCallback?: typeof waitForOAuthCallback;
};

export async function connectSiwcOpenAi(deps: SiwcConnectDeps): Promise<void> {
    const extAgentHostId = await loadOrCreateExtAgentHostId();
    const existing = await loadAiSession();
    const saved =
        existing && existing.version === 2 ? (existing as StoredAiSession) : null;

    const clientIdForAuth = saved?.clientId ?? SIWC_DYNAMIC_CLIENT_ID;
    const isFirstRegistration = clientIdForAuth === SIWC_DYNAMIC_CLIENT_ID;

    const { verifier, challenge } = createPkcePair();
    const state = createOAuthState();
    const nonce = createOAuthNonce();

    const waitFn = deps.waitForCallback ?? waitForOAuthCallback;

    const { result, redirectUri } = await waitFn(state, {
        onListening: async (redirectUri) => {
            const authorizeUrl = buildAuthorizeUrl({
                clientId: clientIdForAuth,
                redirectUri,
                state,
                nonce,
                codeChallenge: challenge,
                extAgentHostId,
                isFirstRegistration,
                idTokenHint: saved?.idToken,
                loginHint: saved?.email,
            });
            await deps.openExternal(authorizeUrl);
        },
    });

    const exchangeClientId =
        result.issuedClientId ??
        (isFirstRegistration ? undefined : clientIdForAuth);
    if (!exchangeClientId) {
        throw new AiAssistError(
            "AI_AUTH_FAILED",
            "Registration did not return a client id",
        );
    }
    if (
        !isFirstRegistration &&
        result.issuedClientId &&
        result.issuedClientId !== clientIdForAuth
    ) {
        throw new AiAssistError("AI_AUTH_FAILED", "Unexpected client id");
    }

    const tokenResponse = await exchangeAuthorizationCode(deps.fetchImpl, {
        clientId: exchangeClientId,
        code: result.code,
        codeVerifier: verifier,
        redirectUri,
    });

    const idClaims = tokenResponse.id_token
        ? parseIdTokenClaims(tokenResponse.id_token)
        : {};

    const session = buildStoredSessionFromTokenResponse({
        clientId: exchangeClientId,
        extAgentHostId,
        tokenResponse,
        email: idClaims.email ?? saved?.email,
        subject: idClaims.sub ?? saved?.subject,
    });
    if (!session.scopes.includes("chatgpt.tokens.use.direct")) {
        throw new AiAssistError(
            "AI_AUTH_FAILED",
            "ChatGPT plan usage is not enabled for this account",
        );
    }
    await saveAiSession(session);
}
