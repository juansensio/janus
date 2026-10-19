# Spec: ai-highlight — slice 1

> Status: **Approved** (2026-10-19). Product slice on **`ai-assist`** + **`manuscript`** (see [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md) note under ai-assist). Depends on shipped **ai-assist slice 1** and **manuscript slice 2**. Queue row 20 (`tasks/queue.md`).

Writers **select existing prose** in the HTML manuscript editor and run the same **Write → highlighted draft → Accept/Reject** loop as AI comments, without placing a free-standing comment first.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. **Desktop only** for slice 1 — same platform gate as ai-assist. Mobile keeps `AI_NOT_SUPPORTED` on any new bridge methods; HTML editing unchanged.
2. **Reuse tags and pipeline** — `janus-ai-comment`, `janus-ai-draft`, `writeForComment`, streaming draft UI, Accept/Reject via `@janus/manuscript` transforms. No second draft format.
3. Rewrite is modeled as a **comment with metadata**: `variant="rewrite"` and `source` attribute on `janus-ai-comment` holding the removed passage (HTML-escaped). Instruction stays in comment body (one localized default from UI; editable before Write; no preset list in slice 1).
4. Selection is limited to **normal paragraphs** (`janus-p` / `janus_p`). **Partial intra-paragraph** and multi-paragraph consecutive selection are required. Selection touching AI comment/draft blocks is **invalid** (inline error, no bridge call).
5. **Reject** restores `source` as `janus-p` block(s) at the comment position. **Delete** rewrite comment before Write restores `source` the same way (no draft). **Accept** uses existing `acceptAiDraft` — draft becomes `janus-p` at the **comment position** (not merged into neighbors).
6. **Prompt** — same JSON draft/refusal contract as Write. Full-book prose context with `<<<WRITE>>>` at the comment; user message adds **Original passage to rewrite:** from `source` when `variant=rewrite`.
7. **Connected OpenAI** required before Write; same error codes as `SPEC-ai-assist.md`.
```

## Objective

On desktop, select passage → **Rewrite selection** → optional edit instruction → **Write** → persisted draft → **Accept** or **Reject**, reusing comment/draft chrome.

### User stories

- As a writer, I select text, click **Rewrite selection**, see an AI comment with a default instruction, and press **Write** when connected.
- As a writer, I edit the instruction in the comment body before Write.
- As a writer, **Accept** applies the draft at the comment position; **Reject** or **delete comment** restores my original selection text.

### Acceptance criteria (slice 1)

- **Domain:** `beginHighlightRewrite(html, input)` removes selected text and inserts rewrite comment with `variant` + `source`; stable `MANUSCRIPT_INVALID` on bad selection.
- **Domain:** `rejectAiDraft` and `deleteAiComment` restore `source` for rewrite comments; non-rewrite behavior unchanged.
- **ai-assist:** `buildGenerateDraftMessages` passes `rewriteSourceText` for rewrite comments; `writeForComment` supplies it from manuscript parse.
- **Bridge:** `beginHighlightRewrite(bookId, input)` read-modify-write manuscript; mobile rejects `AI_NOT_SUPPORTED`.
- **UI:** Desktop-only control for valid non-empty selection; flush autosave before bridge; reuses Write / Accept / Reject chrome.
- **i18n:** `ai.rewriteSelection`, default instruction, selection-error keys in `en` and `es`.
- **CI:** `bun run test`, `bun run lint`, e2e for rewrite affordance + rewrite comment (no live OpenAI).

## Decisions recorded (2026-10-19)

| Topic | Decision |
|-------|----------|
| CAPABILITY-MAP | Note under **ai-assist** only; no new module id row |
| Default instruction | One localized default string; no preset list in slice 1 |
| Selection | Partial selection within `janus-p` **required** |
| Delete before Write | Restore `source` like Reject (no draft) |
| Accept | Draft promoted at **comment position** only |

## Tech stack

Same as Janus (`SPEC-shell.md`, `SPEC-ai-assist.md`): TypeScript, Bun, Vitest, ProseMirror editor in `packages/ui`, Electron IPC in `apps/desktop`.

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
E2E:         bun run e2e
```

## Project structure

```
services/manuscript/
  highlight-rewrite.ts
  manuscript-transforms.ts
  manuscript-html.ts

services/ai-assist/
  prompt.ts

packages/bridge/src/index.ts
packages/ui/src/editor/

apps/desktop/src/
  manuscript-ipc.ts
  manuscript-service.ts

docs/specs/SPEC-ai-highlight.md
```

## Code style

Match `AGENTS.md`. Domain logic only in `services/manuscript` and `services/ai-assist`. Stable error codes on bridge reject.

## Testing strategy

- **Unit:** `beginHighlightRewrite` (partial + multi-paragraph, invalid); reject/delete restore; prompt includes rewrite source.
- **Integration:** Desktop IPC + `writeForComment` with rewrite fixture (mocked provider).
- **UI:** Vitest — rewrite button, bridge payload.
- **E2E:** Select → rewrite → rewrite comment visible.
- **Manual:** Connect → Write → Accept/Reject on dev Mac.

## Boundaries

- **Always:** Manuscript owns HTML transforms; ai-assist owns prompts; UI forwards only.
- **Ask first:** New tag types; rewrite without comment; live OpenAI in CI.
- **Never:** Duplicate Accept/Reject in UI; tokens in manuscript HTML.

## Success criteria

- Desktop loop select → Rewrite → Write → Accept/Reject with on-disk HTML consistent with manuscript slice 2.
- CI green without network credentials.
