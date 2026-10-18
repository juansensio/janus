# ADR: OpenAI consumer auth for Janus desktop (Sign in with ChatGPT)

## Status

Accepted (spike complete, 2026-10-18)

## Decision

**Go** — implement consumer subscription access via OpenAI’s documented **Sign in with ChatGPT (SIWC) open-source / local-client** flow, not API keys and not undocumented reverse-engineering of Codex CLI internals.

**Condition before public distribution:** ChatGPT plan usage is explicitly limited to [open-source tools and personal projects that run locally](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt.md). Paid or remotely hosted products must [join the waitlist](https://developers.openai.com/siwc/token-sharing-open-source.md) first. Janus maintainers must confirm the shipping model matches policy (or obtain partner access) before marketing AI to non-developer audiences.

If policy blocks the intended product shape, **pivot** to an API-key slice (documented Platform path) rather than shipping an unsupported integration.

## Context

Janus ai-assist v1 intent requires in-app sign-in with a **consumer ChatGPT/Codex subscription** (Plus/Pro plan usage), with tokens in the Electron **main process** and inference from `services/ai-assist/` ([`SPEC-ai-assist.md`](../specs/SPEC-ai-assist.md)).

Task 1 asked whether a **third-party Electron app** has a supported OAuth path. Codex desktop, CLI, and IDE extensions already use browser-based ChatGPT sign-in for subscription access ([ChatGPT Learn — Authentication](https://learn.chatgpt.com/docs/auth.md)); Janus needs the **partner-documented** equivalent for its own app identity.

## Evidence summary

| Source | What it establishes |
|--------|---------------------|
| [SIWC quickstart](https://developers.openai.com/siwc/quickstart.md) | ChatGPT plan usage for OSS clients: dynamic registration, OAuth credentials, **no client secret** for eligible Responses API use. |
| [OSS token sharing overview](https://developers.openai.com/siwc/token-sharing-open-source.md) | Desktop/local **agent host** model (`ext_agent_host_id`), dynamic `client_id` per user/workspace registration. |
| [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in.md) | Exact authorize/token endpoints, PKCE, scopes, loopback `redirect_uri`, first-time `client_id=dynamic_agent_client`. |
| [Profiles and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions.md) | Refresh, revoke, credential storage expectations. |
| [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference.md) | `POST https://api.openai.com/v1/responses` with OAuth bearer; `store: false`, `stream: true`. |
| [Codex app-server (SIWC)](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server.md) | Optional subprocess path using same OAuth token; Janus can call Responses API directly instead. |
| [Paste Perfect cookbook (Electron)](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt.md) | Reference Electron main-process pattern (`createChatGPT`, loopback, bridge without tokens in renderer). |

**Not in scope for v1:** Identity-only SIWC for commercial websites (partner trial + client secret). **Not supported:** Scraping ChatGPT web sessions or reusing Codex CLI credential files.

## Janus desktop integration pattern

### OAuth client registration (no manual OpenAI dashboard step for OSS flow)

1. **Per installation:** Generate and persist `ext_agent_host_id` before first sign-in (recommended: `urn:uuid:<uuidv4>` per host). One host ID per machine install; reuse across restarts ([host ID guidance](https://developers.openai.com/siwc/token-sharing-open-source.md)).
2. **First sign-in:** Authorization uses `client_id=dynamic_agent_client`, `agent_name_hint=Janus` (stable display name), plus `ext_agent_host_id`.
3. **Callback:** Browser returns `code`, `state`, and issued `client_id` (`oaiapp_…`). **Save issued `client_id`** with that ChatGPT account; never persist `dynamic_agent_client` as the long-lived client ID.
4. **Re-sign-in:** Use saved issued `client_id`; optional `id_token_hint` from prior ID token for smoother return ([sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in.md)).

No pre-registered OAuth app in a developer console is required for this OSS dynamic-registration path (contrast with [website SIWC](https://developers.openai.com/siwc/website.md), which is partner-only).

### Callback URL (Electron main process)

OpenAI requires an **HTTP loopback** redirect on **`127.0.0.1`** (not `localhost`):

- **Recommended default path:** `http://127.0.0.1:1455/auth/callback` (port may change on later sign-ins; **scheme, host `127.0.0.1`, and path** must stay consistent within one attempt).
- Main process starts a **local HTTP listener** before opening the **system browser** (same class of flow as Codex CLI `codex login`).

### Authorization request (first registration)

- **Authorize URL:** `https://auth.openai.com/api/accounts/authorize`
- **Parameters:** `response_type=code`, PKCE (`code_challenge_method=S256`), fresh `state` and `nonce`, `redirect_uri` as above, `resource=https://api.openai.com/v1`
- **Scopes:** `openid profile email offline_access resource.invoke chatgpt.tokens.use.direct`
- **Token URL:** `https://auth.openai.com/api/accounts/oauth/token` — `authorization_code` grant with issued `client_id`, `code_verifier`, same `redirect_uri` and `resource`; **no client secret**

### Token refresh and disconnect

- **Refresh:** `grant_type=refresh_token` to the same token URL with issued `client_id`, saved `refresh_token`, `resource=https://api.openai.com/v1`; rotate and store replacement refresh token atomically ([profiles and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions.md), [token reference](https://developers.openai.com/siwc/token-sharing-open-source/token-reference.md)).
- **Lifetimes:** Access ~1h; refresh ~30d with rolling replacement.
- **Disconnect:** Revoke refresh token via OIDC `revocation_endpoint` from `https://auth.openai.com/.well-known/openid-configuration`; clear local credentials ([profiles and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions.md)).

### Inference (Write action)

- Use OAuth **access token** as `Authorization: Bearer …` on `POST https://api.openai.com/v1/responses` ([models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference.md)).
- Require scope `chatgpt.tokens.use.direct` in stored credentials before enabling Write.
- List models via `GET https://api.openai.com/v1/models` with the same bearer token.
- **Janus storage:** Electron `safeStorage` or OS keychain wrapper for refresh/access tokens in main; renderer sees only connected/disconnected ([`SPEC-ai-assist.md`](../specs/SPEC-ai-assist.md)).

### Implementation options (Task 10+)

1. **Hand-rolled PKCE + loopback** in `apps/desktop/src/ai-*` following the sign-in doc (full control, no extra dependency).
2. **OpenAI SIWC devkit** (`@siwc/local`, `@siwc/react`) as in the Paste Perfect cookbook — faster path if license terms are acceptable for Janus distribution.

Codex **app-server** subprocess is optional; spec prefers pure TS `fetch` in `services/ai-assist/` with shell-injected access token.

## Alternatives considered

| Option | Verdict |
|--------|---------|
| **Platform API key in settings** | Supported by Codex ecosystem but **out of v1 intent**; keep as **pivot** if SIWC policy blocks shipping. |
| **Embed ChatGPT web / session cookies** | Undocumented, brittle, ToS risk — **reject**. |
| **Reuse Codex CLI credential files** | Not a third-party integration contract — **reject**. |
| **Commercial website SIWC only** | Requires partner trial and confidential client — **wrong fit** for local Electron OSS flow. |
| **Pause ai-assist** | Unnecessary: official OSS/local path exists. |

## ToS and product constraints

- Users must **opt in** to ChatGPT plan usage; manage limits in ChatGPT Settings → Usage ([cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt.md)).
- Integration does **not** grant access to ChatGPT conversation history.
- Errors such as `subscription_sharing_usage_limit_exceeded` require UX that points users to manage usage ([errors and recovery](https://developers.openai.com/siwc/token-sharing-open-source/errors-and-recovery.md)).
- Review OpenAI terms and SIWC devkit license before release.

## Consequences

- **Task 10+** can proceed with loopback OAuth in desktop main and Responses API in `services/ai-assist/`.
- **CI** remains mock-only; manual gate uses a real Plus/Pro account ([`SPEC-ai-assist.md`](../specs/SPEC-ai-assist.md)).
- **Legal/product:** Confirm OSS vs paid distribution against SIWC usage policy before broad launch.

## References

- **Janus implementation guide:** [`docs/ai-auth-desktop.md`](../ai-auth-desktop.md) (flow, on-disk storage, token lifetimes)
- [Sign in with ChatGPT — quickstart](https://developers.openai.com/siwc/quickstart.md)
- [OSS ChatGPT plan usage](https://developers.openai.com/siwc/token-sharing-open-source.md)
- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in.md)
- [Integrating SIWC in an open-source app (Electron)](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt.md)
