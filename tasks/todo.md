# Tasks: AI Write — editor feedback

**Spec:** `docs/specs/SPEC-ai-assist.md` (UI acceptance: loading + inline errors)  
**Plan:** `tasks/plan.md`

---

## Task 1: Write in-flight — disable buttons + busy feedback

**Description:** When Write is clicked, the UI must stay in a locked, informative state until `writeForComment` resolves (success or error). On the **active** comment: disable **Write and Delete**, change Write label to localized “Writing…”, set `aria-busy="true"` on the comment, and show inline status text (e.g. same `ai.writing` string in a `role="status"` region). While **any** write is in flight (`writeInFlight` in `render-editor`): disable Write and Delete on **all** AI comments and disable the header **Add AI comment** button; re-enable everything in `finally` after the bridge returns.

**Acceptance criteria:**

- [x] New locale key `ai.writing` in `en` and `es`
- [x] Active comment: Write + Delete `disabled` for the full pending duration; Write shows busy label; inline status visible
- [x] Other comments: Write + Delete disabled while a write is in flight elsewhere (via shared `isWriteInFlight` hook from shell)
- [x] Header `Add AI comment` disabled for the same period
- [x] All controls restore on both success and failure (failure details come in Task 2)
- [x] Tests assert `disabled` on buttons during a pending `onWriteComment` promise

**Verification:**

- [x] `bun run test packages/ui/src/editor/manuscript-editor.test.ts`
- [x] `bun run lint`
- [x] Manual: delayed `writeForComment` — cannot click Delete or second Write until response; Add comment stays disabled

**Dependencies:** None

**Files likely touched:**

- `packages/ui/src/editor/manuscript-editor.ts`
- `packages/ui/src/editor/render-editor.ts`
- `packages/ui/src/styles/editor.css`
- `services/languages/locales/en.json`
- `services/languages/locales/es.json`
- `packages/ui/src/editor/manuscript-editor.test.ts`

**Estimated scope:** Medium (4–6 files)

---

## Task 2: Inline Write errors + code mapping

**Description:** Add an inline status element under each comment’s actions (`aria-live="polite"`, `role="status"`). On Write failure, show mapped copy from `ai-write-error.ts` (pattern from `ai-connect-error.ts`). Add locale keys for `AI_NOT_CONNECTED`, `AI_CONTEXT_TOO_LARGE`, `AI_PROVIDER_ERROR`, `AI_COMMENT_NOT_FOUND`, `AI_AUTH_FAILED`, and keep generic `ai.writeFailed` as fallback.

**Acceptance criteria:**

- [x] `packages/ui/src/editor/ai-write-error.ts` maps known `AI_*` codes to `ai.*` keys
- [x] Inline error appears on the comment that triggered Write; cleared on new Write attempt
- [x] Write click handler no longer calls `onTransformError` with a duplicate generic message
- [x] Unit tests for mapper + comment inline error display (jsdom)

**Verification:**

- [x] `bun run test packages/ui/src/editor/ai-write-error.test.ts` (new) and manuscript editor tests
- [x] `bun run lint`

**Dependencies:** Task 1

**Files likely touched:**

- `packages/ui/src/editor/ai-write-error.ts`
- `packages/ui/src/editor/ai-write-error.test.ts`
- `packages/ui/src/editor/manuscript-editor.ts`
- `packages/ui/src/styles/editor.css`
- `services/languages/locales/en.json`
- `services/languages/locales/es.json`

**Estimated scope:** Medium (3–5 files)

---

## Checkpoint: After Tasks 1–2

- [x] UI tests pass without desktop
- [x] Mock bridge write flow shows busy + inline error paths
- [x] Review with human before IPC work

---

## Task 3: Editor shell wiring + integration test

**Description:** Update `render-editor.ts` so `onWriteComment` rejects with `Error` carrying `code` from the bridge (use `bridgeErrorCode`). Remove setting header `transformError` for Write failures. Add an editor flow test: open book with AI comment HTML, click Write, assert busy then result (success or inline error).

**Acceptance criteria:**

- [x] Write failures do not populate header `transformError`
- [x] Accept/Reject still use header `transformError` (unchanged)
- [x] `editor-flow.test.ts` (or colocated test) covers Write success and `AI_NOT_CONNECTED` inline message

**Verification:**

- [x] `bun run test packages/ui`
- [x] `bun run lint`
- [x] Manual desktop: visible inline error when not connected

**Dependencies:** Task 2

**Files likely touched:**

- `packages/ui/src/editor/render-editor.ts`
- `packages/ui/src/editor/editor-flow.test.ts`
- `packages/bridge/src/mock-janus-bridge.ts` (if mock needs write hook)

**Estimated scope:** Medium (3–4 files)

---

## Task 4: Desktop write IPC — stable error codes

**Description:** Investigate `janus:ai:writeForComment` logging `code: 'UNKNOWN'`. Ensure `rejectForBridge` returns specific codes for expected failures (`AiAssistError`, manuscript read/write, provider errors). Wrap unexpected errors as `AI_PROVIDER_ERROR` with a safe message in main where appropriate. Add/extend `apps/desktop/src/ai-ipc.test.ts` asserting reject shape for `AI_NOT_CONNECTED` and one provider failure path (mocked).

**Acceptance criteria:**

- [x] IPC test: write without session → renderer-receivable `AI_NOT_CONNECTED`
- [x] No regression: existing `ai-assist` and `ai-ipc` tests pass
- [x] Real failure from dev desktop surfaces non-`UNKNOWN` code when root cause is a known `AiAssistError`

**Verification:**

- [x] `bun run test apps/desktop/src/ai-ipc.test.ts`
- [x] `bun run test services/ai-assist`
- [x] Manual: reproduce terminal case — UI inline message matches code (not only generic library message)

**Dependencies:** Task 3 (UI ready to display codes)

**Files likely touched:**

- `apps/desktop/src/ai-ipc.ts`
- `apps/desktop/src/ai-service.ts`
- `apps/desktop/src/ai-ipc.test.ts`

**Estimated scope:** Medium (2–4 files)

---

## Task 5: Stream draft tokens to editor during Write

**Description:** Surface OpenAI response deltas in the UI while `writeForComment` runs. Provider parses SSE incrementally; desktop forwards chunks over IPC; renderer updates the draft block without autosave until the final HTML returns.

**Acceptance criteria:**

- [x] `generateDraft` accepts `onDraftHtmlDelta` and fires on each accumulated chunk
- [x] Desktop `writeForComment` + `janus:ai:writeDraftDelta` IPC when renderer passes `onDraftDelta`
- [x] Editor `applyStreamingDraft` updates draft in place without marking autosave dirty
- [x] Tests: provider stream body, SSE delta callback, editor flow with partial then final text

**Verification:**

- [x] `bun run test services/ai-assist packages/ui/src/editor`
- [x] `bun run lint`
- [ ] Manual desktop: Write shows draft text growing before request completes

**Dependencies:** Task 4

---

## Task 6: OpenAI model — Settings default + per-comment override

**Description:** Settings picks the default OpenAI model (`openAiModel` in `janus-settings.json`). Each AI comment shows a model `<select>` (`Default (from Settings)` or explicit slug); choice persists as `model` on `<janus-ai-comment>`. Write resolves comment model, else settings, via `resolveWriteModelSlug`.

**Acceptance criteria:**

- [x] Allowlist + Auto in `openai-model-catalog.ts`; bridge `getOpenAiModelSettings` / `setOpenAiModelPreference`
- [x] Settings model `<select>` on desktop
- [x] Comment chrome model `<select>`; `model` attribute round-trips in manuscript HTML
- [x] `writeForComment` uses per-comment model when set
- [x] Tests: catalog, manuscript HTML, settings UI, comment model persistence

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`
- [ ] Manual: set default in Settings; override on one comment; Write uses each model

**Dependencies:** Task 5

---

## Checkpoint: Complete

- [x] Spec UI bullets satisfied: loading on Write, buttons disabled until response, errors inline on comment
- [x] `bun run test` and `bun run lint` pass
- [ ] Maintainer manual: Connect → Write → draft; disconnect → Write → clear inline guidance
