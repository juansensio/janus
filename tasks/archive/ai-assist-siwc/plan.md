# Implementation Plan: AI assist — SIWC Connect completion

**Status:** Complete 2026-10-18. Tasks: `todo.md` (this folder). Manual sign-off: Connect + Write on maintainer Mac.

**Source specs:**

- `docs/specs/SPEC-ai-assist.md` (approved 2026-10-18)
- `docs/adrs/ADR-ai-openai-auth.md` (SIWC **go**)
- Manuscript editor/transforms: `docs/specs/SPEC-manuscript-slice-2.md` (approved)

**Archived build phase:** `tasks/archive/html-manuscript-ai-assist/` (Tasks 1–13; code landed, Connect stub + manual gates open).

## Overview

The HTML manuscript + AI assist **build** is largely done: ProseMirror editor, comment/draft nodes, Accept/Reject, `@janus/ai-assist` provider (`/v1/responses`), desktop IPC, Settings Connect/Write UI, mobile `AI_NOT_SUPPORTED`.

**What is missing vs `SPEC-ai-assist.md`:**

| Spec expectation | Current state |
|------------------|---------------|
| Connect opens system browser + OAuth; user signs in with ChatGPT/Codex subscription | `connectOpenAiCodex` copies `JANUS_OPENAI_ACCESS_TOKEN` from env (dev stub only) |
| Refresh token in main; access token refreshed before inference | Session stores a single `accessToken` string; no refresh |
| Disconnect revokes refresh token at OpenAI | Clears local file only |
| Connected across restart until disconnect/expiry | Works **if** dev env was used at Connect time |
| Manual gate: real Connect + Write on maintainer Mac | Blocked on SIWC |

This plan finishes **consumer Sign in with ChatGPT (SIWC)** in the Electron main process per the ADR, then closes manual MVP smoke and archives the milestone.

## Architecture decisions

| Topic | Decision |
|--------|----------|
| OAuth implementation | **Hand-rolled PKCE + loopback** in `apps/desktop/src/ai-oauth*` (ADR option 1). No new npm dependency unless `/build` proves `@siwc/local` is clearly cheaper — decide in Task 1 spike-in-code, not in plan. |
| Callback | `http://127.0.0.1:<port>/auth/callback` — bind ephemeral port, persist **scheme + host `127.0.0.1` + path** for re-sign-in per OpenAI docs |
| Host identity | Persist `ext_agent_host_id` (`urn:uuid:…`) once per install before first sign-in |
| Client ID | First sign-in: `dynamic_agent_client`; store issued `oaiapp_…` with credentials; re-sign-in uses issued `client_id` + optional `id_token_hint` |
| Credential storage | Extend encrypted blob in main (`safeStorage`); fields: `clientId`, `refreshToken`, `accessToken`, `accessTokenExpiresAt`, `idToken` (for hint), `extAgentHostId`. Renderer never sees tokens. |
| Dev override | Keep optional `JANUS_OPENAI_ACCESS_TOKEN` **only** for local maintainer testing behind explicit check; **not** the default Connect path. Document in `docs/install-macos.md`. |
| Refresh | Main process refreshes access token before `writeForComment` (and on Connect status if expired); atomic rotate of refresh token |
| Disconnect | OIDC revocation + delete local credentials |
| Domain | `services/ai-assist/` unchanged for OAuth; shell owns auth |

## Dependency graph

```
Task 1 Credential schema + host ID persistence
    └── Task 2 PKCE + loopback callback (unit-tested)
            └── Task 3 Connect vertical (browser → tokens → connected status)
                    └── Task 4 Refresh on write + expiry handling
                            └── Task 5 Disconnect + revoke
                                    └── Task 6 Wire ai-service; demote env stub
                                            └── Task 7 Settings error mapping + i18n (auth errors)
                                                    └── Task 8 Manual MVP smoke + docs
                                                            └── Task 9 Archive milestone
```

## Task list (summary)

| # | Title | Delivers |
|---|--------|----------|
| 1 | SIWC credential model | Host ID + encrypted session shape; migration from today’s `accessToken`-only blob |
| 2 | Loopback + PKCE | Testable authorize URL builder + callback server |
| 3 | Connect flow | Real user sign-in; status connected across restart |
| 4 | Token refresh | Write works after ~1h without re-Connect |
| 5 | Disconnect + revoke | Spec-compliant logout |
| 6 | Replace dev Connect stub | `connectOpenAiCodex` runs SIWC; env override documented |
| 7 | Auth error UX | Map `AI_AUTH_FAILED` / usage limits to settings copy (`en`/`es`) |
| 8 | Manual gate + install doc | Maintainer smoke; no CI secrets |
| 9 | Milestone archive | Move this pair to `tasks/archive/` when Task 8 signed off |

Details: `tasks/todo.md`.

## Checkpoints

### After Tasks 1–3

- [ ] Unit tests: PKCE, callback parsing, token response → stored session (mocked HTTP)
- [ ] Manual: Connect opens browser, return to app, Settings shows **Connected**, restart keeps status

### After Tasks 4–6

- [ ] `bun run test` && `bun run lint` green (no live network in CI)
- [ ] Manual: Write produces draft with subscription (no `JANUS_OPENAI_ACCESS_TOKEN` unless testing override)

### After Tasks 7–8 (MVP done)

- [ ] Full smoke: legacy `.md` migration (if needed), comment, Connect, Write, Accept, Shelf, reopen
- [ ] `CAPABILITY-MAP.md` ai-assist row matches shipped behavior (OAuth, not env var)
- [ ] Human sign-off on manual notes

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Loopback port conflict / firewall | Med | Ephemeral port; clear error if bind fails |
| OpenAI policy (OSS vs paid distribution) | High | ADR already flags waitlist; product decision before broad marketing |
| `subscription_sharing_usage_limit_exceeded` | Med | Task 7 maps to `ai.*` strings per SIWC errors doc |
| Token refresh race during Write | Med | Single-flight refresh in main; retry once on 401 |
| `safeStorage` unavailable (rare Linux) | Low | Fail Connect with `AI_AUTH_FAILED`; document macOS primary gate |

## Parallelization

- **Sequential** Tasks 1→6 (shared session + connect contract).
- Task 7 can overlap Task 6 if error codes are stable.
- Task 8 is human-only after Task 6.

## Out of scope (this plan)

- API-key settings path (ADR pivot only)
- Streaming tokens to UI
- Cursor / second provider
- CI live OAuth integration tests
- Windows desktop SIWC (macOS manual gate first)

## Completed baseline (build phase)

See `tasks/archive/html-manuscript-ai-assist/todo.md` for Tasks 1–13. Key paths:

- `services/ai-assist/`, `apps/desktop/src/ai-service.ts`, `ai-session-store.ts`, `ai-ipc.ts`
- `packages/ui` editor + settings Connect/Write
- Specs approved; **Connect acceptance criterion not met** until this plan ships.
