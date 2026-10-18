# Implementation Plan: AI Write — instruction, prose context, refusal

**Status:** Complete 2026-10-18. Tasks: `todo.md` (this folder). Manual sign-off: `hola` refusal, instruction drafts, write lock (human).

**Source spec:** [`docs/specs/SPEC-ai-assist.md`](../docs/specs/SPEC-ai-assist.md) — revise assumption 4 and the prompt contract in Task 1. Intent: [`docs/intent/ai-assist-mvp.md`](../docs/intent/ai-assist-mvp.md).

**Replan:** Same module (`ai-assist`). The previous active plan (editor feedback, model select, draft streaming) has every acceptance criterion checked. This pair replaces it in place. Three manual gates from that plan stay outside this slice: draft text growing before the request completes, Settings vs per-comment model on a live Write, and Connect → Write → disconnect. Button lock and “Writing…” already ship; this plan does not rebuild them.

## Overview

Write still treats every comment as “continue the book” and sends the raw manuscript HTML. A comment has to be an instruction to add or change prose. The model reads the whole book as prose, with a mark where this comment sits. Tags, other comments, and existing drafts stay out. A valid instruction returns a draft in the book’s language, inserted at the comment on Accept. Anything else (`hola`, a question, a critique, a fragment like `colder`) returns a refusal. The manuscript stays as it is, and the comment shows that sentence in the app language.

## Architecture decisions

- **Prose projection lives in `services/ai-assist/`.** It calls `parseManuscriptBlocks` from `@janus/manuscript`. Manuscript keeps the HTML schema. `ai-assist` does not grow a second parser. Desktop keeps passing manuscript HTML; the domain builds the prompt view.
- **Mark.** Paragraph text in reading order, blank line between paragraphs. The target comment becomes a single line `<<<WRITE>>>`. Other comments and drafts are omitted. The comment string is a separate instruction, not part of the prose.
- **One model call, structured result.** The model returns only JSON: `{"kind":"draft","paragraphs":["..."]}` or `{"kind":"refusal","message":"..."}`. Draft paragraphs are plain text. Janus wraps them in `<janus-p>`. A refusal message is the model’s short sentence. The prompt tells it to write that sentence in `locale` (the app language) and to write draft paragraphs in the language of the manuscript prose.
- **Refusal is not a draft.** `generateDraft` throws `AiAssistError` `AI_COMMENT_NOT_INSTRUCTION` with the model message. Desktop does not call `insertOrReplaceDraft`. The UI shows `error.message` on the comment status line. If the message is empty, it falls back to `ai.commentNotInstruction`.
- **No partial draft while the body is still unparsed.** `onDraftHtmlDelta` fires once, with the final `<janus-p>` fragment, only after the body parses as a draft. A refusal fires no delta. “Writing…” and the disabled buttons remain the in-progress feedback. Token-by-token growth in the manuscript waits until a later slice, because streaming raw JSON would flash a refusal into the book.
- **Unparseable output** is `AI_PROVIDER_ERROR`. The manuscript stays unchanged.
- **Accept is unchanged.** It inserts the draft where the comment sits and removes the comment. The writer deals with the old sentences.

## Dependency graph

```
SPEC + intent (Task 1, with the prose builder)
        │
        ▼
write-context  →  prompt + parseWriteResult
        │
        ▼
provider: parse, then one draft delta or throw refusal
        │
        ▼
desktop writeForComment: persist only a draft; refusal code + message survive IPC
        │
        ▼
comment status shows the refusal; buttons stay on the existing write lock
```

## Task list

### Phase 1: What the model is allowed to see and say

- Task 1: Prose context for one comment, and align spec + intent
- Task 2: Prompt + JSON result parser

### Checkpoint: Domain

- [x] Context and parser tests pass without a live provider
- [x] Spec and intent match this plan
- [x] Review with human before wiring the provider

### Phase 2: Write path

- Task 3: Provider returns a draft or a refusal, with no early delta
- Task 4: Desktop persists only a draft; refusal reaches the renderer

### Checkpoint: Main process

- [x] Refusal does not write the manuscript file
- [x] A draft still inserts `janus-ai-draft`
- [x] `bun run test services/ai-assist apps/desktop/src/ai-ipc.test.ts` passes

### Phase 3: Comment status

- Task 5: Locale string and error-code mapping
- Task 6: Comment status shows the refusal

### Checkpoint: Complete

- [x] `hola` shows the refusal on the comment and the book is unchanged
- [x] “Continue” / “make this colder” / “rewrite the jam-jar sentence” still produce a draft
- [x] Write and Delete stay disabled until the response, with “Writing…” on the active comment
- [x] `bun run test` and `bun run lint` pass

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| The model returns prose or HTML instead of JSON | Med | Parser rejects it as `AI_PROVIDER_ERROR`; manuscript unchanged. Manual gate on a real comment. |
| Refusal sentence comes back in the book’s language | Low | Prompt names `locale`. UI falls back to `ai.commentNotInstruction` when `message` is empty. |
| Holding deltas removes live draft growth | Med | Accepted for this slice. “Writing…” stays. One final delta still updates the draft if the renderer applies it before `setHtml`. |
| `ai-assist` → `manuscript` dependency | Low | Manuscript does not import `ai-assist`. Only `parseManuscriptBlocks`. |

## Open questions

- None for this slice. Chapter windows, a style bible, in-place replace, and chat replies stay out.
