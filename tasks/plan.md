# Implementation Plan: AI Write — editor feedback (loading + inline errors)

**Source spec:** [`docs/specs/SPEC-ai-assist.md`](../docs/specs/SPEC-ai-assist.md) — acceptance: “Write button … **loading state**; **errors inline** (not shelf banner).”

**Archived:** N/A (no prior active module plan).

## Overview

When the writer clicks **Write** on an AI comment, the UI should show that work is in progress (seconds to tens of seconds for provider generation) and, on failure, show a **specific, actionable message next to that comment**. Today `render-editor.ts` tracks `writeInFlight` but does not change the comment chrome; failures only set a generic string on a header `.editor-error`, which is easy to miss. The terminal error `{ message: 'Library operation failed', code: 'UNKNOWN' }` on `janus:ai:writeForComment` means the renderer often cannot map failures to `ai.*` copy even when main knows more.

This plan is a **vertical polish slice** on `packages/ui` + a thin **desktop IPC error** fix so codes reach the UI.

## Current gaps (vs spec)

| Area | Today | Target |
|------|--------|--------|
| Loading | `writeInFlight` blocks double-submit only | **All relevant controls disabled** until IPC returns; active comment shows “Writing…” + `aria-busy` |
| Progress | No change until draft appears | Inline status (`aria-live="polite"`) on the comment that started Write |
| Button guard | Write/Delete stay clickable during slow requests | On that comment: **Write + Delete disabled** until success/failure; **every** AI comment’s Write/Delete disabled while any write is in flight; **Add AI comment** disabled in editor chrome for same period |
| Errors | Header `transformError` + generic `ai.writeFailed` | Inline under comment actions; map `AI_*` codes like Settings connect |
| IPC | Some failures become `UNKNOWN` in main log | Stable `code` on reject for write path (tests) |

## Architecture decisions

- **Own comment chrome state in `manuscript-editor.ts`** — ProseMirror `nodeView` owns Write/Delete; on Write click, disable **both** buttons on that comment until `onWriteComment` settles, show “Writing…” on Write, set `aria-busy` on the comment, and show inline status text (same pattern as shelf dialog inline errors, not page banner).
- **Global write lock** — `render-editor` already sets `writeInFlight`; expose `isWriteInFlight()` (or callback) into `createManuscriptEditor` so **every** comment nodeView disables Write/Delete while any write runs, and the header **Add AI comment** button is disabled for the same window (re-enable only after response).
- **Mirror Settings connect mapping** — Add `packages/ui/src/editor/ai-write-error.ts` (like `ai-connect-error.ts`) mapping `bridgeErrorCode(error)` → `ai.*` locale keys; add missing keys in `services/languages/locales/en.json` and `es.json`.
- **Single error surface for Write** — Inline on the comment; stop duplicating generic failures in header `transformError` for Write (keep header for accept/reject transform failures unless we inline those later).
- **`onWriteComment` contract** — `render-editor` propagates rejection (mapped message on `Error` + `code`) so the nodeView can display inline copy; remove the redundant `.catch(() => onTransformError(...))` on Write in `manuscript-editor.ts`.
- **Desktop** — In `rejectForBridge` / `writeForComment` path, ensure thrown values are `AiAssistError` or `{ code, message }` (wrap unexpected provider/manuscript errors as `AI_PROVIDER_ERROR` where appropriate). Do not change provider logic in the same task as UI unless needed for code propagation.

## Dependency graph

```
Locale strings (ai.writing, ai.notConnected, …)
        │
        ├── ai-write-error.ts (code → key)
        │
        ▼
manuscript-editor nodeView (busy + inline status)
        │
        ▼
render-editor (reject with coded Error; no header write errors)
        │
        ▼
desktop ai-ipc / ai-service (stable codes on failure) ──► enables specific inline copy
```

## Task list

### Phase 1: Comment-level UX (UI-only path)

- Task 1: Write in-flight UI — disable comment + chrome buttons until response, busy label, CSS, unit tests
- Task 2: Inline error region + `ai-write-error.ts` + en/es strings + unit tests

### Checkpoint: UI with mock bridge

- [ ] Mock bridge: delayed `writeForComment` shows busy then draft
- [ ] Mock bridge: reject with `AI_NOT_CONNECTED` shows inline “connect first” style copy
- [ ] `bun run test packages/ui` and `bun run lint` pass

### Phase 2: Wire editor shell + IPC fidelity

- Task 3: `render-editor.ts` — propagate write failures to nodeView; editor flow test for Write
- Task 4: Desktop — preserve/map write failure codes; extend `ai-ipc.test.ts`

### Checkpoint: Desktop manual

- [ ] Connect OpenAI → Write disables comment + header buttons until draft returns → controls re-enable
- [ ] Disconnect → Write shows inline not-connected guidance (not silent / generic UNKNOWN)
- [ ] Main log shows structured `code` on intentional failures (not only `UNKNOWN`)

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| ProseMirror nodeView not updating if DOM mutated incorrectly | Med | Only toggle classes/text on stable elements; test in jsdom |
| Long writes feel stuck | Low | Busy label + `aria-live`; no streaming in v1 per spec |
| UNKNOWN errors persist for some provider bugs | Med | Task 4 wraps/logs root cause in main; UI still shows `ai.writeFailed` fallback |

## Open questions

- **Global editor status line** — Should “Writing…” also appear in `.editor-status` next to autosave? Default **no** (comment-inline is enough); revisit if writers miss it.
- **Second Write while one in flight** — **Resolved:** global guard stays; other comments’ Write/Delete are **disabled** (not merely no-ops) until the in-flight request completes.
- **Draft Accept/Reject during Write** — Default **leave enabled** (orthogonal to comment Write); disable only if manual testing shows confusion.

## Human review

Confirm scope: **disable comment + Add-comment buttons until write completes**, **inline status + errors on the active comment**, **fix IPC codes** so failure copy is specific (not streaming tokens).
