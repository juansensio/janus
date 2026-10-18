# Tasks: AI assist — SIWC Connect completion

**Plan:** `tasks/plan.md`  
**Specs:** `docs/specs/SPEC-ai-assist.md`, `docs/adrs/ADR-ai-openai-auth.md`  
**Archived build phase:** `tasks/archive/html-manuscript-ai-assist/`

---

## Task 1: SIWC credential model + host ID

**Description:** Replace the minimal `StoredAiSession` (`accessToken` only) with an ADR-aligned credential record and persist `ext_agent_host_id` before first sign-in. Migrate or clear legacy session files on upgrade.

**Acceptance criteria:**

- [x] `ext_agent_host_id` generated once (`urn:uuid:…`) and stored encrypted in main
- [x] Session stores at minimum: `clientId` (`oaiapp_…` after first login), `refreshToken`, `accessToken`, `accessTokenExpiresAt`, optional `idToken` for re-auth hint
- [x] Renderer/bridge types unchanged (connected boolean only)
- [x] Unit tests for load/save/migration (mock `safeStorage`)

**Verification:**

- [x] `bun run test apps/desktop` (session store tests)
- [x] `bun run lint`

**Dependencies:** None

**Files likely touched:** `apps/desktop/src/ai-session-store.ts`, `apps/desktop/src/ai-session-store.test.ts` (new)

**Estimated scope:** Medium

---

## Task 2: PKCE + loopback callback server

**Description:** Implement PKCE (S256), authorize URL construction per ADR (scopes, `resource`, `agent_name_hint=Janus`, first-time `client_id=dynamic_agent_client`), and a local HTTP listener on `127.0.0.1` that captures `code`, `state`, and issued `client_id` from the callback query.

**Acceptance criteria:**

- [x] Authorize URL includes required scopes (`openid profile email offline_access resource.invoke chatgpt.tokens.use.direct`)
- [x] Callback validates `state`; rejects mismatch
- [x] Server binds `127.0.0.1` only; path `/auth/callback` (port ephemeral)
- [x] Tests use injected HTTP handler / mock socket (no real browser in CI)

**Verification:**

- [x] `bun run test apps/desktop`
- [x] `bun run lint`

**Dependencies:** Task 1

**Files likely touched:** `apps/desktop/src/ai-oauth.ts` (new), `apps/desktop/src/ai-oauth.test.ts` (new)

**Estimated scope:** Medium

---

## Task 3: Connect flow (browser → token exchange)

**Description:** Vertical slice: `connectOpenAiCodex` starts loopback server, opens **system browser** to authorize URL, exchanges code at `https://auth.openai.com/api/accounts/oauth/token`, persists credentials, sets connected status.

**Acceptance criteria:**

- [x] First sign-in uses `dynamic_agent_client`; persisted issued `client_id` used on subsequent Connect
- [x] Token exchange uses PKCE `code_verifier`; no client secret
- [x] On success, `getAiProviderStatus()` → connected; survives app restart
- [x] User cancel / timeout / exchange failure → `AI_AUTH_FAILED` without partial credentials
- [x] IPC tests mock OAuth module (no network in CI)

**Verification:**

- [x] `bun run test apps/desktop`
- [ ] Manual: Connect with ChatGPT Plus/Pro account — Settings **Connected**, no env var

**Dependencies:** Task 2

**Files likely touched:** `apps/desktop/src/ai-service.ts`, `apps/desktop/src/ai-oauth.ts`, `apps/desktop/src/ai-ipc.test.ts`

**Estimated scope:** Medium

---

## Checkpoint: Connect works (after Task 3)

- [ ] Manual Connect + restart on maintainer Mac
- [x] `bun run test` && `bun run lint`

---

## Task 4: Access token refresh before Write

**Description:** Before `generateDraft`, ensure a valid access token: refresh when near expiry or on provider 401 once.

**Acceptance criteria:**

- [x] Refresh uses `grant_type=refresh_token` with saved `client_id` and `resource=https://api.openai.com/v1`
- [x] New refresh token replaces old atomically on success
- [x] Refresh failure clears session or marks disconnected with `AI_AUTH_FAILED`
- [x] Unit tests mock token endpoint

**Verification:**

- [x] `bun run test apps/desktop` && `bun run test services/ai-assist`
- [ ] Manual: Connect, Write successfully (draft on disk)

**Dependencies:** Task 3

**Files likely touched:** `apps/desktop/src/ai-service.ts`, `apps/desktop/src/ai-oauth.ts`

**Estimated scope:** Medium

---

## Task 5: Disconnect + OIDC revoke

**Description:** `disconnectOpenAiCodex` revokes refresh token via OIDC `revocation_endpoint` (from OpenID discovery), then clears local credentials.

**Acceptance criteria:**

- [x] Revoke called with refresh token when present; local file removed even if revoke fails (log only)
- [x] Status disconnected immediately; Write returns `AI_NOT_CONNECTED`
- [x] Tests mock revocation HTTP

**Verification:**

- [x] `bun run test apps/desktop`
- [ ] Manual: Disconnect → Connect again works

**Dependencies:** Task 4

**Files likely touched:** `apps/desktop/src/ai-service.ts`, `apps/desktop/src/ai-oauth.ts`

**Estimated scope:** Small

---

## Task 6: Remove default env-var Connect path

**Description:** `connectOpenAiCodex` invokes SIWC by default. Optional `JANUS_OPENAI_ACCESS_TOKEN` remains for maintainer override only (documented, not required for normal users).

**Acceptance criteria:**

- [x] Connect without env var uses Task 3 flow
- [x] `SPEC-ai-assist.md` dev-connect note updated to “override only” or removed after SIWC ships
- [x] No regression in mocked IPC tests

**Verification:**

- [x] `bun run test`
- [ ] Manual: fresh user path needs no token in shell env

**Dependencies:** Task 5

**Files likely touched:** `apps/desktop/src/ai-service.ts`, `docs/specs/SPEC-ai-assist.md`

**Estimated scope:** Small

---

## Task 7: Settings auth error copy

**Description:** Map `AiAssistError` codes (and known OpenAI usage errors) to `ai.*` strings instead of generic `ai.connectFailed` for all failures.

**Acceptance criteria:**

- [x] Connect failures show distinct copy for auth failed vs user cancelled vs network
- [x] Keys in `services/languages/locales/en.json` and `es.json`
- [x] UI test or unit test for error mapping helper

**Verification:**

- [x] `bun run test packages/ui`
- [x] `bun run lint`

**Dependencies:** Task 6 (error codes stable)

**Files likely touched:** `packages/ui/src/settings/render-settings.ts`, `services/languages/locales/*.json`

**Estimated scope:** Small

---

## Task 8: Manual MVP smoke + install doc

**Description:** Run full desktop checklist from archived Task 13; document AI Connect for developers in `docs/install-macos.md` (SIWC, no secrets in repo).

**Acceptance criteria:**

- [ ] Manual smoke: legacy `.md` migration (if applicable), comment, **Connect (SIWC)**, Write, draft highlight, Accept, Shelf, reopen
- [x] `docs/install-macos.md` mentions desktop AI Connect (subscription, main-process auth)
- [x] `CAPABILITY-MAP.md` ai-assist bullet reflects OAuth Connect (not env stub)
- [x] `bun run test` && `bun run lint` && `bun run validate:install`

**Verification:**

- [ ] Human sign-off on smoke notes (PR comment or archive readme)

**Dependencies:** Task 7

**Files likely touched:** `docs/install-macos.md`, `CAPABILITY-MAP.md`

**Estimated scope:** Small

---

## Task 9: Archive completion plan

**Description:** When Task 8 is signed off, archive this pair to `tasks/archive/ai-assist-siwc/` and leave root `tasks/` ready for the next capability.

**Acceptance criteria:**

- [ ] `tasks/archive/ai-assist-siwc/plan.md` + `todo.md` copied from root
- [ ] `tasks/archive/README.md` row added
- [ ] Root `tasks/plan.md` / `tasks/todo.md` replaced or cleared per next `/plan`

**Verification:**

- [ ] Human confirms milestone complete

**Dependencies:** Task 8

**Estimated scope:** XS

---

## Checkpoint: MVP spec complete (after Task 8)

- [ ] Desktop AI loop works on maintainer Mac **without** `JANUS_OPENAI_ACCESS_TOKEN`
- [x] Spec acceptance criterion “Connect opens OAuth” satisfied (code)
- [ ] Ready for Task 9 archive
