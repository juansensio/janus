# Tasks: AI Write — instruction, prose context, refusal

**Spec:** `docs/specs/SPEC-ai-assist.md` (revise in Task 1)  
**Intent:** `docs/intent/ai-assist-mvp.md` (revise in Task 1)  
**Plan:** `tasks/plan.md`

---

## Task 1: Prose context for one comment

**Description:** Build the text the model is allowed to read. Given manuscript HTML and a comment id, return paragraph text in reading order with a `<<<WRITE>>>` line where that comment sits. Omit other comments and drafts. Depend on `@janus/manuscript` `parseManuscriptBlocks` rather than parsing tags again. Update the spec and intent so Write is an instruction to add or change prose, the context is this prose view of the whole book, and a non-instruction gets a refusal on the comment with no draft.

**Acceptance criteria:**

- [x] `buildWriteContext` places `<<<WRITE>>>` at the target comment and includes surrounding paragraph text only
- [x] Other comments, draft blocks, and tags are absent from the result
- [x] Missing comment id throws `AI_COMMENT_NOT_FOUND`
- [x] `SPEC-ai-assist.md` assumption 4 and `docs/intent/ai-assist-mvp.md` describe this contract

**Verification:**

- [x] `bun run test services/ai-assist/write-context.test.ts`
- [x] `bun run lint`

**Dependencies:** None

**Files likely touched:**

- `services/ai-assist/write-context.ts`
- `services/ai-assist/write-context.test.ts`
- `services/ai-assist/package.json`
- `docs/specs/SPEC-ai-assist.md`
- `docs/intent/ai-assist-mvp.md`

**Estimated scope:** Medium (5 files)

---

## Task 2: Prompt and result parser

**Description:** `buildGenerateDraftMessages` sends the prose context, the instruction (comment text), and the app `locale`. The system prompt requires JSON only: a draft of plain-text paragraphs in the manuscript’s language, or a refusal whose `message` is a short sentence in `locale` meaning the comment is not an instruction to add or change prose. `parseWriteResult` returns `{ kind: "draft", paragraphs }` or `{ kind: "refusal", message }`. Anything else throws `AI_PROVIDER_ERROR`.

**Acceptance criteria:**

- [x] Prompt for a comment contains the prose view and `<<<WRITE>>>`, and does not contain the raw manuscript HTML
- [x] Prompt tells the model to write draft paragraphs in the manuscript’s language and the refusal message in `locale`
- [x] Parser accepts a draft payload and a refusal payload
- [x] Parser rejects prose, HTML, and JSON without `kind`

**Verification:**

- [x] `bun run test services/ai-assist/ai-assist.test.ts`
- [x] `bun run lint`

**Dependencies:** Task 1

**Files likely touched:**

- `services/ai-assist/prompt.ts`
- `services/ai-assist/write-result.ts`
- `services/ai-assist/write-result.test.ts`
- `services/ai-assist/ai-assist.test.ts`
- `services/ai-assist/index.ts`

**Estimated scope:** Medium (5 files)

---

## Checkpoint: After Tasks 1–2

- [ ] Context and parser tests pass without a live provider
- [ ] Spec and intent match `tasks/plan.md`
- [ ] Review with human before wiring the provider

---

## Task 3: Provider branches on the parsed result

**Description:** `generateDraft` reads the full response, then `parseWriteResult`. A draft becomes `<janus-p>` fragments and `onDraftHtmlDelta` runs once with that final fragment. A refusal throws `AI_COMMENT_NOT_INSTRUCTION` with the model message and runs no delta. Add the code to `AiAssistErrorCode`.

**Acceptance criteria:**

- [x] Streamed draft JSON yields `draftHtml` of `<janus-p>` paragraphs and a single delta with that HTML
- [x] A refusal JSON throws `AI_COMMENT_NOT_INSTRUCTION` and invokes no delta
- [x] A non-JSON body throws `AI_PROVIDER_ERROR` and invokes no delta

**Verification:**

- [x] `bun run test services/ai-assist`
- [x] `bun run lint`

**Dependencies:** Task 2

**Files likely touched:**

- `services/ai-assist/provider.ts`
- `services/ai-assist/openai-codex-provider.ts`
- `services/ai-assist/ai-assist.test.ts`

**Estimated scope:** Medium (3 files)

---

## Task 4: Desktop persists only a draft

**Description:** `writeForComment` inserts a draft only when `generateDraft` returns one. A refusal leaves the manuscript file unchanged and rejects with `AI_COMMENT_NOT_INSTRUCTION` plus the model message, using the same IPC error shape as the other `AI_*` codes. The outer catch must not wrap that code as `AI_PROVIDER_ERROR`.

**Acceptance criteria:**

- [ ] IPC test: refusal body → reject `code` is `AI_COMMENT_NOT_INSTRUCTION` and `message` is the model sentence
- [ ] That path does not call manuscript write
- [ ] A draft result still returns updated HTML containing `janus-ai-draft`

**Verification:**

- [ ] `bun run test apps/desktop/src/ai-ipc.test.ts`
- [ ] `bun run test services/ai-assist`
- [ ] `bun run lint`

**Dependencies:** Task 3

**Files likely touched:**

- `apps/desktop/src/ai-service.ts`
- `apps/desktop/src/ai-ipc.ts`
- `apps/desktop/src/ai-ipc.test.ts`
- `apps/desktop/src/ai-service.integration.test.ts`

**Estimated scope:** Medium (4 files)

---

## Checkpoint: After Tasks 3–4

- [ ] Refusal does not write the manuscript file
- [ ] A draft still inserts `janus-ai-draft`
- [ ] `bun run test services/ai-assist apps/desktop/src/ai-ipc.test.ts` passes

---

## Task 5: Locale string and error-code mapping

**Description:** Add `ai.commentNotInstruction` in `en` and `es`. Map `AI_COMMENT_NOT_INSTRUCTION` to that key. When the error has a non-empty `message`, the displayed string is that message; otherwise the locale string.

**Acceptance criteria:**

- [ ] Keys exist in `en` and `es`
- [ ] Mapper returns the model message when the code is `AI_COMMENT_NOT_INSTRUCTION` and `message` is non-empty
- [ ] Empty message maps to `ai.commentNotInstruction`

**Verification:**

- [ ] `bun run test packages/ui/src/editor/ai-write-error.test.ts`
- [ ] `bun run lint`

**Dependencies:** Task 4

**Files likely touched:**

- `packages/ui/src/editor/ai-write-error.ts`
- `packages/ui/src/editor/ai-write-error.test.ts`
- `services/languages/locales/en.json`
- `services/languages/locales/es.json`

**Estimated scope:** Small (4 files)

---

## Task 6: Comment status shows the refusal

**Description:** The comment status line uses the Task 5 string. The existing write lock stays: Write, Delete, the model select, and Add AI comment stay disabled until the promise settles, with “Writing…” on the active comment. A refusal must not leave a draft in the editor.

**Acceptance criteria:**

- [ ] Editor flow: bridge rejects with `AI_COMMENT_NOT_INSTRUCTION` and a message → that message is on the comment, manuscript HTML unchanged, buttons enabled again
- [ ] Empty message shows the locale string
- [ ] A successful Write still ends in a draft and re-enables the buttons

**Verification:**

- [ ] `bun run test packages/ui/src/editor`
- [ ] `bun run lint`
- [ ] Manual: comment `hola` → refusal on the comment, book unchanged; comment `continue` → draft in the book’s language

**Dependencies:** Task 5

**Files likely touched:**

- `packages/ui/src/editor/manuscript-editor.ts`
- `packages/ui/src/editor/render-editor.ts`
- `packages/ui/src/editor/editor-flow.test.ts`

**Estimated scope:** Medium (3 files)

---

## Checkpoint: Complete

- [ ] `hola` shows the refusal on the comment and the book is unchanged
- [ ] “Continue”, “make this colder”, and “rewrite the jam-jar sentence” produce a draft
- [ ] Write and Delete stay disabled until the response, with “Writing…” on the active comment
- [ ] `bun run test` and `bun run lint` pass
