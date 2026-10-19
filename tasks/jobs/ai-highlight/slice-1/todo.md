# Todo: ai-highlight — slice 1

**Source spec:** `docs/specs/SPEC-ai-highlight.md`

## Task 1: Comment attrs + beginHighlightRewrite

- [x] Partial selection splits `janus-p` into before | comment | after when needed
- [x] Multi-paragraph selection joins `source` with `\n\n`
- [x] Invalid selection throws `MANUSCRIPT_INVALID`
- [x] `bun run test services/manuscript` passes new tests

## Task 2: Reject and delete restore rewrite source

- [x] Reject with draft removes draft + comment and inserts source paragraphs
- [x] Delete rewrite comment restores source without draft
- [x] Non-rewrite reject/delete unchanged
- [x] Tests

## Task 3: ai-assist rewrite prompt + write path

- [x] Prompt user message contains `Original passage to rewrite:` when applicable
- [x] Existing Write tests still pass
- [x] `bun run test services/ai-assist` green

## Task 4: Bridge + IPC

- [x] Desktop IPC test or service test persists HTML with rewrite comment
- [x] Mock bridge updated
- [x] Mobile `AI_NOT_SUPPORTED`

## Task 5: Editor UI + i18n

- [x] Rewrite disabled/hidden when selection invalid or empty
- [x] Valid selection inserts comment with default instruction
- [x] Delete rewrite comment uses restore path (domain)
- [x] en/es strings; UI tests

## Task 6: E2E

- [x] Flow under `e2e/flows/highlight-rewrite.spec.ts`
- [x] `bun run e2e` passes
