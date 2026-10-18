# Tasks: HTML manuscript + AI assist (MVP)

**Plan:** `tasks/plan.md`  
**Specs:** `docs/specs/SPEC-manuscript-slice-2.md`, `docs/specs/SPEC-ai-assist.md`  
**Intent:** `docs/intent/ai-assist-mvp.md`  
**Archived:** `tasks/archive/desktop-release/`

---

## Task 1: OpenAI Codex OAuth / subscription spike

**Description:** Research and document the supported way for a **third-party Electron app** to authenticate a **consumer** OpenAI/Codex account (not API keys). Record endpoints, redirect URIs, token refresh, and ToS constraints.

**Acceptance criteria:**

- [x] ADR or short doc under `docs/` (e.g. `docs/adrs/ADR-ai-openai-auth.md`) states **go**, **pivot**, or **pause** with evidence links
- [x] If **go**: lists exact OAuth client registration steps and callback URL pattern for Janus desktop
- [x] If **no supported path**: recommends next intent change (e.g. API key slice) before implementation continues to Task 10
- [x] `SPEC-ai-assist.md` Open Questions section updated or cross-linked

**Verification:**

- [ ] Human review of spike doc (no code required for this task)

**Dependencies:** None

**Files likely touched:** `docs/adrs/ADR-ai-openai-auth.md`, `docs/specs/SPEC-ai-assist.md`

**Estimated scope:** Small

---

## Task 2: Manuscript HTML schema (domain)

**Description:** Add parse/serialize/validate for `janus-manuscript` v1 and child tags; empty document helper; reject unknown tags with `MANUSCRIPT_INVALID`.

**Acceptance criteria:**

- [x] `MANUSCRIPT_FILENAME` → `manuscript.html` in domain (callers updated in Task 3)
- [x] Round-trip tests for empty doc, single `janus-p`, Unicode
- [x] Invalid/unknown tag → `ManuscriptServiceError` with `MANUSCRIPT_INVALID`
- [x] Comment body shape: plain text inside `janus-ai-comment` (locked in tests)

**Verification:**

- [x] `bun run test services/manuscript`
- [x] `bun run lint`

**Dependencies:** None (parallel with Task 1)

**Files likely touched:** `services/manuscript/manuscript-html.ts`, `services/manuscript/manuscript-html.test.ts`, `services/manuscript/index.ts`

**Estimated scope:** Medium

---

## Task 3: Read/write + legacy `.md` migration

**Description:** Vertical slice: open book reads `manuscript.html`; if only `manuscript.md` exists, migrate once to HTML; atomic write unchanged.

**Acceptance criteria:**

- [x] Missing both files → empty HTML in memory; file created on first save
- [x] Legacy `.md` → `.html` with `janus-p` paragraphs; subsequent reads use `.html` only
- [x] Desktop + mobile bridge `readManuscript` / `writeManuscript` still work; IPC tests updated
- [x] Existing manuscript slice 1 tests updated or superseded

**Verification:**

- [x] `bun run test`
- [ ] Manual: open book with old `.md`, edit, Shelf — `manuscript.html` present

**Dependencies:** Task 2

**Files likely touched:** `services/manuscript/manuscript-service.ts`, `apps/desktop/src/*manuscript*`, `apps/mobile/src/native-bridge.ts`, `packages/bridge/src/index.ts`

**Estimated scope:** Medium

---

## Task 4: Draft transforms + bridge IPC

**Description:** Implement `acceptAiDraft`, `rejectAiDraft`, `insertOrReplaceDraft` in domain; expose on `JanusBridge` + desktop/mobile IPC (transforms work on mobile; AI not required).

**Acceptance criteria:**

- [x] Golden HTML fixtures for accept (unwrap + remove comment), reject (drop draft only), insert/replace draft after comment
- [x] Accept missing draft → stable error; reject missing draft → no-op safe
- [x] `createMockJanusBridge` implements new methods

**Verification:**

- [x] `bun run test services/manuscript`
- [x] Desktop IPC tests for transform methods

**Dependencies:** Task 3

**Files likely touched:** `services/manuscript/manuscript-transforms.ts`, `packages/bridge/src/index.ts`, `apps/desktop/src/*ipc*`

**Estimated scope:** Medium

---

## Checkpoint: Domain + bridge (after Tasks 2–4)

- [x] Migration + transform tests green
- [x] `bun run test` && `bun run lint`

---

## Task 5: ProseMirror editor — `janus-p` + autosave

**Description:** Replace textarea with ProseMirror (or approved dep); serialize to HTML string; preserve 1s autosave and Shelf flush semantics.

**Acceptance criteria:**

- [x] Typing creates/updates `janus-p` nodes in saved HTML
- [x] Autosave and back-to-shelf behavior match slice 1 semantics
- [x] `document.documentElement.lang` / editor `lang` still follow UI locale
- [x] Colocated UI tests updated (happy-dom)

**Verification:**

- [x] `bun run test packages/ui`
- [ ] `bun run dev:desktop` — type, Shelf, reopen

**Dependencies:** Task 3

**Files likely touched:** `packages/ui/src/editor/*`, `package.json` / `packages/ui/package.json` (ProseMirror deps — ask first)

**Estimated scope:** Large → split only if needed during `/build`

---

## Task 6: Comment & draft node views

**Description:** ProseMirror nodes for `janus-ai-comment` and `janus-ai-draft`; distinct CSS (draft highlighted); writer can **add** an AI comment (toolbar or control).

**Acceptance criteria:**

- [x] New comment gets unique `id` attribute on save
- [x] Draft node renders with `comment-id`; editable draft body before Accept
- [x] Serialized HTML matches domain parser expectations

**Verification:**

- [x] UI tests: insert comment → HTML contains `janus-ai-comment`
- [ ] Manual: add comment, save, reopen — persisted

**Dependencies:** Task 5

**Files likely touched:** `packages/ui/src/editor/*`, `packages/ui/src/**/*.css` or existing style module

**Estimated scope:** Medium

---

## Task 7: Accept / Reject controls

**Description:** Editor UI calls bridge `acceptAiDraft` / `rejectAiDraft`; reload or apply returned HTML to editor state; inline errors.

**Acceptance criteria:**

- [x] Accept/Reject on draft updates on-disk HTML via autosave path
- [x] Matches intent: accept removes comment + draft wrappers; reject keeps comment
- [x] No shelf banner for transform failures

**Verification:**

- [x] UI test with mock bridge
- [ ] Manual end-to-end without AI (hand-insert draft tag or dev helper)

**Dependencies:** Task 4, Task 6

**Files likely touched:** `packages/ui/src/editor/*`

**Estimated scope:** Small

---

## Checkpoint: Manuscript slice 2 (after Tasks 5–7)

- [x] HTML editor works desktop + mobile (no AI)
- [ ] Legacy migration + Accept/Reject verified
- [x] `bun run test` && `bun run lint`

---

## Task 8: `@janus/ai-assist` core

**Description:** New workspace package: prompt builder (full HTML + comment text + locale), `AiProvider` interface, context size guard (512 KiB).

**Acceptance criteria:**

- [ ] Unit tests with mocked `fetch` for successful draft text response
- [ ] `AI_CONTEXT_TOO_LARGE` when over limit
- [ ] No Electron imports in package

**Verification:**

- [ ] `bun run test services/ai-assist`

**Dependencies:** Task 4 (insert contract known)

**Files likely touched:** `services/ai-assist/*`, root `package.json` workspaces

**Estimated scope:** Medium

---

## Task 9: Desktop AI session IPC

**Description:** Main-process token storage (`safeStorage`), connect/disconnect/status bridge methods; mobile stubs `AI_NOT_SUPPORTED`.

**Acceptance criteria:**

- [ ] Renderer never receives refresh token
- [ ] `getAiProviderStatus()` reflects connected/disconnected across restart (when connected)
- [ ] Connect flow opens OAuth UI shell (can use placeholder URL until Task 10)
- [ ] IPC tests with fakes

**Verification:**

- [ ] `bun run test apps/desktop` (or targeted IPC tests)
- [ ] `bun run lint`

**Dependencies:** Task 1 (**go**), Task 8

**Files likely touched:** `apps/desktop/src/ai-*`, `packages/bridge/src/index.ts`, `apps/mobile/src/native-bridge.ts`

**Estimated scope:** Medium

---

## Task 10: OpenAI Codex provider implementation

**Description:** Wire real HTTP per Task 1 spike; map errors to `AI_PROVIDER_ERROR` / `AI_AUTH_FAILED`.

**Acceptance criteria:**

- [ ] Provider implements `generateDraft` with session access token from shell
- [ ] Tests use mocked HTTP only (no CI secrets)
- [ ] Documented env vars / client id location (no secrets committed)

**Verification:**

- [ ] `bun run test services/ai-assist`
- [ ] Optional manual call with dev credentials (local only)

**Dependencies:** Task 1 (**go**), Task 8, Task 9

**Files likely touched:** `services/ai-assist/openai-codex-provider.ts`

**Estimated scope:** Medium

---

## Task 11: `writeForComment` pipeline

**Description:** IPC: load HTML → validate comment id → generate → `insertOrReplaceDraft` → return/save; no partial draft on failure.

**Acceptance criteria:**

- [ ] `writeForComment(bookId, commentId)` updates manuscript with `janus-ai-draft`
- [ ] Second Write replaces draft for same comment
- [ ] `AI_NOT_CONNECTED` when disconnected
- [ ] `AI_COMMENT_NOT_FOUND` for bad id

**Verification:**

- [ ] Integration test with mock provider + real transforms
- [ ] Manual desktop with Task 10 provider

**Dependencies:** Task 7, Task 9, Task 10

**Files likely touched:** `apps/desktop/src/ai-*`, `services/manuscript/manuscript-transforms.ts`

**Estimated scope:** Medium

---

## Task 12: Settings Connect + Write UI + i18n

**Description:** Settings OpenAI connect/disconnect; Write on comment with loading state; `ai.*` strings in `en`/`es`.

**Acceptance criteria:**

- [ ] Settings shows connection status (desktop only)
- [ ] Write disabled when not connected or while in-flight
- [ ] All new user-facing strings in both catalogs
- [ ] Mobile: AI entry points hidden or show unavailable; bridge rejects

**Verification:**

- [ ] `bun run test`
- [ ] Manual: Connect → Write → draft highlight

**Dependencies:** Task 11

**Files likely touched:** `packages/ui/src/settings/*`, `packages/ui/src/editor/*`, `services/languages/locales/*.json`

**Estimated scope:** Medium

---

## Task 13: Approve specs + manual MVP smoke

**Description:** Mark manuscript slice 2 and ai-assist specs **approved**; run desktop smoke checklist.

**Acceptance criteria:**

- [ ] `SPEC-manuscript-slice-2.md` and `SPEC-ai-assist.md` status → approved with date
- [ ] Manual smoke: legacy migration, comment, Write, Accept, Shelf, reopen
- [ ] `bun run test` && `bun run lint` && `bun run validate:install`

**Verification:**

- [ ] Human sign-off on manual smoke notes in PR or archive comment

**Dependencies:** Task 12

**Files likely touched:** `docs/specs/SPEC-manuscript-slice-2.md`, `docs/specs/SPEC-ai-assist.md`

**Estimated scope:** Small

---

## Checkpoint: MVP complete (after Task 13)

- [ ] Desktop AI loop works on maintainer Mac
- [ ] Specs approved; plan tasks 1–13 checked
- [ ] Ready to archive plan to `tasks/archive/html-manuscript-ai-assist/` when done
