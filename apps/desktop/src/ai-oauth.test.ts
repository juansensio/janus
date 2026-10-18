import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AiAssistError } from "@janus/ai-assist";
import {
    buildAuthorizeUrl,
    createPkcePair,
    exchangeAuthorizationCode,
    parseOAuthCallbackQuery,
    refreshAccessToken,
    SIWC_DYNAMIC_CLIENT_ID,
} from "./ai-oauth";
import { buildStoredSessionFromTokenResponse } from "./ai-session-store";

describe("createPkcePair", () => {
    it("produces S256 challenge from verifier", () => {
        const { verifier, challenge } = createPkcePair();
        const expected = createHash("sha256")
            .update(verifier)
            .digest("base64url");
        expect(challenge).toBe(expected);
    });
});

describe("buildAuthorizeUrl", () => {
    it("includes SIWC parameters for first registration", () => {
        const url = buildAuthorizeUrl({
            clientId: SIWC_DYNAMIC_CLIENT_ID,
            redirectUri: "http://127.0.0.1:1455/auth/callback",
            state: "state-1",
            nonce: "nonce-1",
            codeChallenge: "challenge",
            extAgentHostId: "urn:uuid:test",
            isFirstRegistration: true,
        });
        const parsed = new URL(url);
        expect(parsed.origin + parsed.pathname).toBe(
            "https://auth.openai.com/api/accounts/authorize",
        );
        expect(parsed.searchParams.get("client_id")).toBe(
            SIWC_DYNAMIC_CLIENT_ID,
        );
        expect(parsed.searchParams.get("agent_name_hint")).toBe("Janus");
        expect(parsed.searchParams.get("ext_agent_host_id")).toBe(
            "urn:uuid:test",
        );
        expect(parsed.searchParams.get("code_challenge_method")).toBe("S256");
        expect(parsed.searchParams.get("scope")).toContain(
            "chatgpt.tokens.use.direct",
        );
    });

    it("omits agent_name_hint on reauthorization", () => {
        const url = buildAuthorizeUrl({
            clientId: "oaiapp_abc",
            redirectUri: "http://127.0.0.1:1455/auth/callback",
            state: "state-1",
            nonce: "nonce-1",
            codeChallenge: "challenge",
            extAgentHostId: "urn:uuid:test",
            isFirstRegistration: false,
            idTokenHint: "id.jwt.hint",
        });
        const parsed = new URL(url);
        expect(parsed.searchParams.get("agent_name_hint")).toBeNull();
        expect(parsed.searchParams.get("id_token_hint")).toBe("id.jwt.hint");
    });
});

describe("parseOAuthCallbackQuery", () => {
    it("returns code and issued client id when state matches", () => {
        const params = new URLSearchParams({
            code: "auth-code",
            state: "expected",
            client_id: "oaiapp_xyz",
        });
        expect(parseOAuthCallbackQuery(params, "expected")).toEqual({
            code: "auth-code",
            issuedClientId: "oaiapp_xyz",
        });
    });

    it("throws AI_AUTH_CANCELLED when user denies", () => {
        const params = new URLSearchParams({
            error: "access_denied",
            state: "expected",
        });
        expect(() => parseOAuthCallbackQuery(params, "expected")).toThrow(
            AiAssistError,
        );
        try {
            parseOAuthCallbackQuery(params, "expected");
        } catch (error) {
            expect(error).toMatchObject({ code: "AI_AUTH_CANCELLED" });
        }
    });

    it("rejects state mismatch", () => {
        const params = new URLSearchParams({
            code: "auth-code",
            state: "wrong",
        });
        expect(() => parseOAuthCallbackQuery(params, "expected")).toThrow(
            AiAssistError,
        );
    });
});

describe("token HTTP helpers", () => {
    it("exchanges authorization code via form POST", async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                access_token: "access",
                refresh_token: "refresh",
                expires_in: 3600,
                scope: "chatgpt.tokens.use.direct",
            }),
        }));
        const token = await exchangeAuthorizationCode(fetchImpl as typeof fetch, {
            clientId: "oaiapp_1",
            code: "code",
            codeVerifier: "verifier",
            redirectUri: "http://127.0.0.1:1/auth/callback",
        });
        expect(token.access_token).toBe("access");
        expect(fetchImpl).toHaveBeenCalledWith(
            "https://auth.openai.com/api/accounts/oauth/token",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("refreshes access token and keeps client id", async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            json: async () => ({
                access_token: "access-new",
                refresh_token: "refresh-new",
                expires_in: 3600,
                scope: "chatgpt.tokens.use.direct",
            }),
        }));
        const session = buildStoredSessionFromTokenResponse({
            clientId: "oaiapp_1",
            extAgentHostId: "urn:uuid:host",
            tokenResponse: {
                access_token: "old",
                refresh_token: "refresh-old",
                expires_in: 1,
            },
        });
        const next = await refreshAccessToken(fetchImpl as typeof fetch, session);
        expect(next.accessToken).toBe("access-new");
        expect(next.clientId).toBe("oaiapp_1");
    });
});
