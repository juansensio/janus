# Todo: ai-highlight — slice 1

**Source spec:** `docs/specs/SPEC-ai-highlight.md`

## Task 1: Comment attrs + beginHighlightRewrite

**Description:** Parse/serialize `variant` and `source` on `janus-ai-comment`. Implement `beginHighlightRewrite(html, input)` with partial and multi-paragraph spans.

**Acceptance criteria**

- [ ] Partial selection splits `janus-p` into before | comment | after when needed
- [ ] Multi-paragraph selection joins `source` with `\n\n`
- [ ] Invalid selection throws `MANUSCRIPT_INVALID`
- [ ] `bun run test services/manuscript` passes new tests

**Verify:** `bun run test services/manuscript/highlight-rewrite.test.ts`

---

## Task 2: Reject and delete restore rewrite source

**Description:** Shared restore helper; `rejectAiDraft` restores source for rewrite drafts; `deleteAiComment` restores source for rewrite comments (no draft).

**Acceptance criteria**

- [ ] Reject with draft removes draft + comment and inserts source paragraphs
- [ ] Delete rewrite comment (editor + domain) restores source without draft
- [ ] Non-rewrite reject/delete unchanged
- [ ] Tests in `manuscript-transforms.test.ts` or dedicated file

**Verify:** `bun run test services/manuscript`

---

## Task 3: ai-assist rewrite prompt + write path

**Description:** `rewriteSourceText` on `GenerateDraftInput`; `buildGenerateDraftMessages` includes original passage; desktop `writeForComment` reads rewrite comment from parse.

**Acceptance criteria**

- [ ] Prompt user message contains `Original passage to rewrite:` when applicable
- [ ] Existing Write tests still pass
- [ ] `bun run test services/ai-assist` green

**Verify:** `bun run test services/ai-assist`

---

## Task 4: Bridge + IPC

**Description:** `beginHighlightRewrite` on `JanusBridge`, preload, manuscript IPC, `manuscript-service`; mobile `AI_NOT_SUPPORTED`.

**Acceptance criteria**

- [ ] Desktop IPC test or service test persists HTML with rewrite comment
- [ ] Mock bridge updated
- [ ] `bun run test apps/desktop` (affected tests) green

**Verify:** `bun run test apps/desktop/src/manuscript-ipc.test.ts` (and ai tests if touched)

---

## Task 5: Editor UI + i18n

**Description:** Schema attrs; `selectionToHighlightSpans`; desktop **Rewrite selection** control; flush autosave → `beginHighlightRewrite` → `setHtml`; default instruction string en/es; Vitest for button + bridge call.

**Acceptance criteria**

- [ ] Rewrite disabled/hidden when selection invalid or empty
- [ ] Valid selection inserts comment with default instruction (editable)
- [ ] Delete rewrite comment uses restore path
- [ ] `bun run test packages/ui` green for new/changed editor tests

**Verify:** `bun run test packages/ui/src/editor`

---

## Task 6: E2E

**Description:** Playwright flow: type prose, select substring, rewrite → AI comment with rewrite variant visible.

**Acceptance criteria**

- [ ] New flow under `e2e/flows/`; no live OpenAI
- [ ] `bun run e2e` passes (or documented subset if harness limits)

**Verify:** `bun run e2e`
