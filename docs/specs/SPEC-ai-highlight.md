# Spec: ai-highlight — slice 1

> Status: **Draft** (2026-10-19). Pending human approval before `/plan` or `/build`. Module id `ai-highlight` (product slice on **`ai-assist`** + **`manuscript`**; not a separate CAPABILITY-MAP row until map revision). Depends on shipped **ai-assist slice 1** and **manuscript slice 2**. Queue row 20 (`tasks/queue.md`).

Writers **select existing prose** in the HTML manuscript editor and run the same **Write → highlighted draft → Accept/Reject** loop as AI comments, without placing a free-standing comment first.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. **Desktop only** for slice 1 — same platform gate as ai-assist. Mobile keeps `AI_NOT_SUPPORTED` on any new bridge methods; HTML editing unchanged.
2. **Reuse tags and pipeline** — `janus-ai-comment`, `janus-ai-draft`, `writeForComment`, streaming draft UI, Accept/Reject via `@janus/manuscript` transforms. No second draft format.
3. Rewrite is modeled as a **comment with metadata**: optional `variant="rewrite"` and `source` attribute on `janus-ai-comment` holding the removed passage (HTML-escaped). Instruction stays in comment body (default string from UI; editable before Write).
4. Selection is limited to **normal paragraphs** (`janus-p` / `janus_p` in the editor). Partial or multi-paragraph selection within consecutive `janus-p` blocks is in scope. Selection touching AI comment/draft blocks is **invalid** (inline error, no bridge call).
5. **Reject** on a rewrite draft restores `source` as one or more `janus-p` blocks at the comment position and removes comment + draft. **Accept** uses existing `acceptAiDraft` (draft → `janus-p`, comment removed).
6. **Prompt** — same JSON draft/refusal contract as Write. Full-book prose context with `<<<WRITE>>>` at the comment position; user message adds **Original passage to rewrite:** from `source` when `variant=rewrite`.
7. **Connected OpenAI** required before Write; same error codes as `SPEC-ai-assist.md`.
→ Correct on review or approve to proceed.
```

## Objective

On desktop, select passage → **Rewrite selection** → optional edit instruction → **Write** → persisted draft → **Accept** or **Reject**, reusing comment/draft chrome.

### User stories

- As a writer, I select text, click **Rewrite selection**, see an AI comment with a sensible default instruction, and press **Write** when connected.
- As a writer, I edit the instruction in the comment body before Write.
- As a writer, **Accept** applies the draft as normal paragraphs where the passage was removed; **Reject** puts my original text back.

### Acceptance criteria (slice 1)

- **Domain:** `beginHighlightRewrite(html, input)` removes selected text and inserts rewrite comment with `variant` + `source`; stable `MANUSCRIPT_INVALID` on bad selection.
- **Domain:** `rejectAiDraft` restores `source` paragraphs for rewrite-linked drafts; non-rewrite reject behavior unchanged.
- **ai-assist:** `buildGenerateDraftMessages` (and context builder) pass `rewriteSourceText` when comment is rewrite variant.
- **Bridge:** `beginHighlightRewrite(bookId, input)` read-modify-write manuscript; mobile rejects `AI_NOT_SUPPORTED`.
- **UI:** Desktop-only control enabled for valid non-empty selection; flush autosave before bridge call; reuses existing Write / Accept / Reject UI on comment and draft nodes.
- **i18n:** `ai.rewriteSelection`, default instruction key, selection-error keys in `en` and `es`.
- **CI:** `bun run test`, `bun run lint` pass; e2e flow asserts rewrite affordance + rewrite comment appears after action (no live OpenAI).

## Decisions (proposed for build — confirm at approval)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persistence model | Comment `variant` + `source` attrs | Reuses Write/Accept/Reject; one on-disk story |
| Default instruction | Localized fixed string (e.g. “Rewrite this passage.”) | Fast path; writer edits comment before Write |
| Multi-paragraph source | Join with `\n\n` in `source`; split on reject | Matches paragraph boundaries in block model |
| New bridge method | `beginHighlightRewrite` only | UI does not import `services/*`; main persists |
| Selection UX | Header or floating control when selection valid | Minimal slice; no new modal unless review asks |
| E2E scope | Toolbar + DOM/serialized comment with `variant="rewrite"` | CI-safe without Codex |

## Open questions (for approver)

1. **CAPABILITY-MAP:** Treat `ai-highlight` as a slice note under `ai-assist` only, or add a map row before build?
2. **Default instruction:** Is a single default enough, or should slice 1 offer a small preset list (e.g. “Shorter”, “More vivid”)?
3. **Partial vs whole paragraph:** Confirm partial intra-`janus-p` selection is required for slice 1 (spec assumes yes).
4. **Delete rewrite comment:** Should deleting the comment before Write restore `source` (symmetric with Reject), or leave a gap? *Proposal:* restore on delete, same as Reject without draft.
5. **Accept placement:** When rewrite removed multiple paragraphs, Accept inserts draft block(s) at comment position only — confirm that matches writer expectation vs merging into neighbors.

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

Focused:

```
bun run test services/manuscript
bun run test services/ai-assist
```

## Project structure

```
services/manuscript/
  highlight-rewrite.ts      → beginHighlightRewrite
  highlight-rewrite.test.ts
  manuscript-transforms.ts  → rewrite-aware reject
  manuscript-html.ts        → parse/serialize comment attrs

services/ai-assist/
  prompt.ts                 → original passage in user message
  write-context.ts

packages/bridge/src/index.ts → beginHighlightRewrite on JanusBridge
packages/ui/src/editor/     → selection → spans, toolbar, schema attrs

apps/desktop/src/
  manuscript-ipc.ts
  manuscript-service.ts

docs/specs/SPEC-ai-highlight.md
```

## Code style

Match `AGENTS.md`. Domain logic only in `services/manuscript` and `services/ai-assist`. Stable error codes on bridge reject (`MANUSCRIPT_INVALID`, existing `AI_*`). No provider or token handling in UI.

## Testing strategy

- **Unit:** `beginHighlightRewrite` — partial paragraph, multi-paragraph, empty/invalid selection; `rejectAiDraft` restore; prompt includes `rewriteSourceText`.
- **Integration:** Desktop manuscript IPC + `writeForComment` with rewrite comment fixture (mocked provider).
- **UI:** Vitest — rewrite button visibility, bridge called with expected spans after selection.
- **E2E:** Type prose, select, rewrite → visible AI comment with rewrite variant (Playwright).
- **Manual (pre-merge):** Connect → Rewrite selection → Write → Accept/Reject on dev Mac.

## Boundaries

- **Always:** One owning module per rule — manuscript for HTML transforms; ai-assist for prompts/provider; UI forwards events only.
- **Ask first:** New tag types; rewrite without comment block; per-selection model override; changing Accept to merge into adjacent paragraphs differently.
- **Never:** Duplicate Accept/Reject in CSS/DOM; store OAuth tokens in manuscript HTML; live OpenAI in CI.

## Success criteria

- Approved spec → plan → build: desktop loop select → Rewrite → Write → Accept/Reject works with on-disk HTML consistent with manuscript slice 2.
- CI green without network credentials.
