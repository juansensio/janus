# Tasks: AI assist — SIWC Connect completion

**Plan:** `plan.md` (this folder)  
**Specs:** `docs/specs/SPEC-ai-assist.md`, `docs/adrs/ADR-ai-openai-auth.md`  
**Archived build phase:** `tasks/archive/html-manuscript-ai-assist/`  
**Manual sign-off:** 2026-10-18 (Connect + Write verified on maintainer Mac)

---

## Task 1: SIWC credential model + host ID

**Acceptance criteria:**

- [x] `ext_agent_host_id` generated once (`urn:uuid:…`) and stored encrypted in main
- [x] Session stores at minimum: `clientId`, `refreshToken`, `accessToken`, `accessTokenExpiresAt`, optional `idToken`
- [x] Renderer/bridge types unchanged (connected boolean only)
- [x] Unit tests for load/save/migration (mock `safeStorage`)

**Verification:**

- [x] `bun run test apps/desktop` (session store tests)
- [x] `bun run lint`

---

## Task 2: PKCE + loopback callback server

**Acceptance criteria:**

- [x] Authorize URL includes required scopes
- [x] Callback validates `state`; rejects mismatch
- [x] Server binds `127.0.0.1` only; path `/auth/callback` (port ephemeral)
- [x] Tests use injected HTTP handler / mock socket (no real browser in CI)

**Verification:**

- [x] `bun run test apps/desktop`
- [x] `bun run lint`

---

## Task 3: Connect flow (browser → token exchange)

**Acceptance criteria:**

- [x] First sign-in uses `dynamic_agent_client`; persisted issued `client_id` used on subsequent Connect
- [x] Token exchange uses PKCE `code_verifier`; no client secret
- [x] On success, `getAiProviderStatus()` → connected; survives app restart
- [x] User cancel / timeout / exchange failure without partial credentials
- [x] IPC tests mock OAuth module (no network in CI)

**Verification:**

- [x] `bun run test apps/desktop`
- [x] Manual: Connect with ChatGPT Plus/Pro — Settings **Connected**, no env var

---

## Checkpoint: Connect works (after Task 3)

- [x] Manual Connect + restart on maintainer Mac
- [x] `bun run test` && `bun run lint`

---

## Task 4: Access token refresh before Write

**Acceptance criteria:**

- [x] Refresh uses `grant_type=refresh_token` with saved `client_id` and `resource`
- [x] New refresh token replaces old atomically on success
- [x] Refresh failure clears session or marks disconnected with `AI_AUTH_FAILED`
- [x] Unit tests mock token endpoint

**Verification:**

- [x] `bun run test apps/desktop` && `bun run test services/ai-assist`
- [x] Manual: Connect, Write successfully (draft on disk)

---

## Task 5: Disconnect + OIDC revoke

**Acceptance criteria:**

- [x] Revoke called with refresh token when present; local file removed even if revoke fails
- [x] Status disconnected immediately; Write returns `AI_NOT_CONNECTED`
- [x] Tests mock revocation HTTP

**Verification:**

- [x] `bun run test apps/desktop`
- [x] Manual: Disconnect → Connect again works

---

## Task 6: Remove default env-var Connect path

**Acceptance criteria:**

- [x] Connect without env var uses SIWC flow
- [x] `SPEC-ai-assist.md` dev-connect note updated to override only
- [x] No regression in mocked IPC tests

**Verification:**

- [x] `bun run test`
- [x] Manual: fresh user path needs no token in shell env

---

## Task 7: Settings auth error copy

**Acceptance criteria:**

- [x] Connect failures show distinct copy for auth failed vs user cancelled vs network
- [x] Keys in `en` and `es` catalogs
- [x] UI test for error mapping helper

**Verification:**

- [x] `bun run test packages/ui`
- [x] `bun run lint`

---

## Task 8: Manual MVP smoke + install doc

**Acceptance criteria:**

- [x] Manual smoke: Connect (SIWC), Write, draft, Accept (maintainer Mac)
- [x] `docs/install-macos.md` mentions desktop AI Connect
- [x] `CAPABILITY-MAP.md` ai-assist bullet reflects OAuth Connect
- [x] `bun run test` && `bun run lint` && `bun run validate:install`

**Verification:**

- [x] Human sign-off (2026-10-18)

---

## Task 9: Archive completion plan

**Acceptance criteria:**

- [x] `tasks/archive/ai-assist-siwc/plan.md` + `todo.md`
- [x] `tasks/archive/README.md` row added
- [x] Root `tasks/plan.md` / `tasks/todo.md` idle for next `/plan`

**Verification:**

- [x] Milestone complete

---

## Checkpoint: MVP spec complete

- [x] Desktop AI loop works without `JANUS_OPENAI_ACCESS_TOKEN`
- [x] Spec acceptance criterion “Connect opens OAuth” satisfied
- [x] Archived to `tasks/archive/ai-assist-siwc/`
