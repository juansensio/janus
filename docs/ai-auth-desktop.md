# Desktop OpenAI authentication (Sign in with ChatGPT)

How Janus connects a writer’s **ChatGPT Plus or Pro** subscription for AI **Write** on desktop. This is the user-facing and maintainer-facing companion to the decision record [`docs/adrs/ADR-ai-openai-auth.md`](adrs/ADR-ai-openai-auth.md) and module spec [`docs/specs/SPEC-ai-assist.md`](specs/SPEC-ai-assist.md).

**Scope:** Electron desktop only. Mobile returns `AI_NOT_SUPPORTED` for Connect and Write.

## What you see in the app

1. **Settings → OpenAI (Codex)** shows **Connected** or **Not connected**.
2. **Connect OpenAI** starts sign-in. **Disconnect** ends the session and clears local credentials.
3. The editor **Write** button on an AI comment works only when connected (desktop).

The UI never shows access or refresh tokens. It only calls bridge methods (`connectOpenAiCodex`, `disconnectOpenAiCodex`, `getAiProviderStatus`, `writeForComment`) over IPC.

## End-to-end sign-in flow

Janus uses OpenAI’s **Sign in with ChatGPT** open-source / local-client OAuth (SIWC): dynamic client registration, PKCE, and a loopback redirect. No API key and no pre-registered OAuth app in a developer dashboard.

```mermaid
sequenceDiagram
    participant UI as Renderer (Settings)
    participant Main as Electron main
    participant Loop as Loopback HTTP 127.0.0.1
    participant Browser as System browser
    participant OpenAI as auth.openai.com
    participant API as api.openai.com

    UI->>Main: connectOpenAiCodex (IPC)
    Main->>Main: Load/create ext_agent_host_id
    Main->>Loop: Listen on /auth/callback (ephemeral port)
    Main->>Browser: Open authorize URL (PKCE + state)
    Browser->>OpenAI: User signs in and consents
    OpenAI->>Loop: Redirect ?code&state&client_id
    Loop->>Main: Validate state, capture code
    Main->>OpenAI: POST /oauth/token (code + verifier)
    OpenAI->>Main: access_token, refresh_token, id_token, scope
    Main->>Main: Encrypt and save session
    Main->>UI: Success (status Connected)

    Note over UI,API: Later: Write
    UI->>Main: writeForComment (IPC)
    Main->>Main: Refresh access token if near expiry
    Main->>API: POST /v1/responses (Bearer access_token)
    API->>Main: Generated text
    Main->>Main: Insert draft in manuscript, save file
```

### Step-by-step (main process)

| Step | What happens |
|------|----------------|
| 1. Host identity | On first use, main generates and persists `ext_agent_host_id` (`urn:uuid:…`). One ID per Janus install; reused for every sign-in on that machine. |
| 2. Loopback server | Main binds an HTTP server on **`127.0.0.1`** only (not `localhost`), path **`/auth/callback`**, ephemeral port (e.g. `http://127.0.0.1:54321/auth/callback`). |
| 3. PKCE + state | Main creates a PKCE verifier/challenge (S256), random `state`, and `nonce` for this attempt only. |
| 4. Authorize URL | Main opens the **system browser** to `https://auth.openai.com/api/accounts/authorize` with scopes including `chatgpt.tokens.use.direct`, `resource=https://api.openai.com/v1`, and either `client_id=dynamic_agent_client` (first registration) or the saved issued `client_id` (`oaiapp_…`) on return visits. First-time requests include `agent_name_hint=Janus`. Re-sign-in may send `id_token_hint` / `login_hint` from the saved session. |
| 5. Browser callback | After the user approves, OpenAI redirects to the loopback URL with `code`, `state`, and (on first registration) issued `client_id`. Main validates `state`, rejects user cancel (`access_denied`), and shows a short “return to Janus” HTML page. |
| 6. Token exchange | Main POSTs to `https://auth.openai.com/api/accounts/oauth/token` with `grant_type=authorization_code`, the issued `client_id`, `code`, `code_verifier`, same `redirect_uri`, and `resource`. **No client secret.** |
| 7. Persist | Main stores tokens and metadata (see below). Connect fails if granted scopes do not include `chatgpt.tokens.use.direct`. |
| 8. Status | `getAiProviderStatus()` returns connected while a session file exists. |

Implementation: `apps/desktop/src/ai-oauth.ts` (`connectSiwcOpenAi`), `apps/desktop/src/ai-service.ts` (`connectOpenAiCodex`), IPC in `apps/desktop/src/ai-ipc.ts`.

## Using auth for Write

When you press **Write**:

1. Main loads the encrypted session from disk.
2. If the access token is **near expiry** (within about one minute), main refreshes it (see below) before calling OpenAI.
3. `@janus/ai-assist` sends `POST https://api.openai.com/v1/responses` with `Authorization: Bearer <access_token>` and manuscript context from the open book.
4. On `AI_AUTH_FAILED` from the provider, main attempts **one** refresh and retries the request.
5. If refresh fails, main clears the session; you must Connect again.

Generation logic stays in `services/ai-assist/`; only the shell holds tokens.

## Token lifetime and refresh

OpenAI documents approximate lifetimes for this flow (see ADR and [OpenAI profiles and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions.md)):

| Credential | Typical lifetime | Janus behavior |
|------------|------------------|----------------|
| **Access token** | ~1 hour (`expires_in` from token response) | Stored as `accessTokenExpiresAt` (ISO time). Refreshed before Write when expiry is within **60 seconds**. |
| **Refresh token** | ~30 days, rolling replacement | Stored encrypted. Each successful refresh replaces both access and refresh tokens on disk atomically. |
| **ID token** | Short-lived OIDC token | Stored to support smoother re-sign-in (`id_token_hint`). Not used as the API bearer for Write. |
| **Issued client ID** | Long-lived per ChatGPT account on this host | Stored as `clientId` (`oaiapp_…`). Never persist `dynamic_agent_client` as the long-term ID. |

**Staying connected:** After a successful Connect, you remain connected across app restarts until **Disconnect** or until refresh fails (expired/revoked refresh token, policy change, etc.).

**Disconnect:** Main calls OpenAI’s OIDC revocation endpoint (from `https://auth.openai.com/.well-known/openid-configuration`) with the refresh token (best effort), then deletes the local session file.

## Where data is stored

All paths are under Electron **`app.getPath("userData")`** (on macOS, typically `~/Library/Application Support/Janus/` for a production build; dev runs may use a different userData path).

| File | Contents | Encryption |
|------|----------|------------|
| `ai-openai-host-id.bin` | `{ extAgentHostId }` | Electron `safeStorage` (OS keychain-backed where available) |
| `ai-openai-session.bin` | SIWC session v2 (see schema below) or dev-override blob | Same |

Files are written with mode **0600** where the platform allows. **Do not commit or log these files.**

### Session schema (version 2)

After SIWC Connect, the decrypted JSON shape is conceptually:

```json
{
  "provider": "openai-codex",
  "version": 2,
  "clientId": "oaiapp_…",
  "extAgentHostId": "urn:uuid:…",
  "accessToken": "…",
  "refreshToken": "…",
  "accessTokenExpiresAt": "2026-10-18T15:00:00.000Z",
  "idToken": "…",
  "email": "user@example.com",
  "subject": "…",
  "scopes": ["chatgpt.tokens.use.direct", "offline_access", "…"],
  "connectedAt": "2026-10-18T14:00:00.000Z"
}
```

Code: `apps/desktop/src/ai-session-store.ts`.

### What never touches the renderer

- Refresh and access tokens
- PKCE verifier, authorization `code`, or raw token HTTP responses
- Full `id_token` (only main reads it for hints and optional email/subject)

Preload exposes IPC only; Settings sees **connected / not connected** and error codes/messages.

## Maintainer dev override (not for end users)

If `JANUS_OPENAI_ACCESS_TOKEN` is set in the **main process environment** when Electron starts, **Connect** skips SIWC and stores a small `dev-override` session (access token only, no refresh). Use this only for local HTTP testing. Normal writers use **Connect OpenAI** in Settings with no env var.

## Security and policy notes

- Manuscript text is sent to OpenAI only when you press **Write** and only over HTTPS from main, using your connected session.
- Janus does **not** read ChatGPT conversation history; scope is plan usage for inference (`chatgpt.tokens.use.direct`).
- ChatGPT plan usage for third-party local tools is subject to OpenAI SIWC policy (OSS/local vs commercial distribution). See the ADR before marketing AI broadly.
- Usage limits and billing are managed in the user’s ChatGPT account settings; errors such as `subscription_sharing_usage_limit_exceeded` may surface as provider failures.

## Related docs

- Install smoke test: [`docs/install-macos.md`](install-macos.md) § OpenAI assist
- ADR (integration decision): [`docs/adrs/ADR-ai-openai-auth.md`](adrs/ADR-ai-openai-auth.md)
- Module behavior: [`docs/specs/SPEC-ai-assist.md`](specs/SPEC-ai-assist.md)
