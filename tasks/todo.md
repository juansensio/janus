<<<<<<< HEAD
# Active todo (pointer)

**Active slice:** `tasks/jobs/support-docs/slice-1/todo.md` — **all tasks complete** (PR #6).

| # | Task | Status |
|---|------|--------|
| 1 | Support-docs domain service | done |
| 2 | Bridge contract and mock | done |
| 3 | Desktop IPC and adapter | done |
| 4 | Mobile native bridge | done |
| 5 | Project nav and catalogs | done |
| 6 | Editor doc switch and autosave | done |
| 7 | UI unit tests | done |
| 8 | E2E support-docs flow | done |
=======
# Active tasks: support-docs slice 1

**Spec:** [`docs/specs/SPEC-support-docs.md`](../docs/specs/SPEC-support-docs.md)

**Archived:** zoom slice 2 → [`tasks/archive/zoom-slice-2/`](archive/zoom-slice-2/)

---

## Task 1: Support-docs domain service

**Description:** Add `@janus/support-docs` with kind registry (`worldbuilding`), path `support/worldbuilding.md`, list/create/read/write plain files, and editor HTML binding (paragraph-only) via manuscript migration helpers.

**Acceptance criteria:**

- [x] `createSupportDocService` lists `[{ kind: "worldbuilding", exists: boolean }]`
- [x] `createSupportDoc` creates `support/` and empty `.md` file; duplicate rejects `SUPPORT_DOC_ALREADY_EXISTS`
- [x] `readSupportDocEditorHtml` returns empty manuscript HTML for empty file; missing file rejects `SUPPORT_DOC_NOT_FOUND`
- [x] `writeSupportDocFromEditorHtml` persists plain text; rejects AI/draft blocks with `SUPPORT_DOC_INVALID`
- [x] Plain round-trip preserves paragraphs per legacy `manuscript.md` rules

**Verification:**

- [x] `bun run test services/support-docs`
- [x] `bun run lint`

**Dependencies:** None

**Files:** `services/support-docs/*`

---

## Task 2: Bridge contract and mock

**Description:** Extend `JanusBridge` with support-doc methods and error codes; implement mock store for Vitest/UI.

**Acceptance criteria:**

- [x] `SupportDocKind`, `SupportDocSummary` exported from `@janus/bridge`
- [x] `listSupportDocs`, `createSupportDoc`, `readSupportDoc`, `writeSupportDoc` on interface
- [x] `createMockJanusBridge` implements in-memory behavior consistent with domain semantics

**Verification:**

- [x] `bun run test packages/bridge`

**Dependencies:** Task 1

**Files:** `packages/bridge/src/index.ts`, `mock-janus-bridge.ts`, `package.json`

---

## Task 3: Desktop IPC and adapter

**Description:** Wire desktop main/preload to `createSupportDocsBridgeService` (book dir resolution + domain), with Vitest mirroring `manuscript-ipc` patterns.

**Acceptance criteria:**

- [x] IPC channels registered in `main.ts`; preload exposes four methods
- [x] Invalid book id / missing book map to existing library error codes
- [x] Support-doc domain errors surface stable `code` on reject
- [x] Integration test: create book, create worldbuilding, read/write round-trip on disk

**Verification:**

- [x] `bun run test apps/desktop/src/support-docs-ipc.test.ts` (or colocated test path)
- [x] `bun run lint`

**Dependencies:** Task 2

**Files:** `apps/desktop/src/support-docs-*.ts`, `main.ts`, `preload.ts`, `package.json`

---

## Task 4: Mobile native bridge

**Description:** Capacitor FS adapter + `createSupportDocsBridgeService`; wire `native-bridge.ts`.

**Acceptance criteria:**

- [x] Mobile bridge implements all four support-doc methods
- [x] Behavior matches desktop for create/list/read/write on in-memory or fixture FS test

**Verification:**

- [x] `bun run test apps/mobile` (support-docs tests)

**Dependencies:** Task 2

**Files:** `apps/mobile/src/support-docs-service.ts`, `native-bridge.ts`, `package.json`

---

## Task 5: Project nav and catalogs

**Description:** Segmented **Manuscript | Worldbuilding** control; inline create panel when worldbuilding missing; localized strings.

**Acceptance criteria:**

- [ ] Nav renders in editor header with accessible tab/segment pattern
- [ ] Selecting Worldbuilding when `exists: false` shows inline Create (not auto-create on tab focus alone before click)
- [ ] Keys in `en.json` and `es.json` for nav labels and create copy

**Verification:**

- [ ] `bun run test packages/ui/src/editor/editor-project-nav.test.ts`
- [ ] `bun run lint`

**Dependencies:** Task 2 (types/messages only; can use mock bridge in tests)

**Files:** `packages/ui/src/editor/editor-project-nav.ts`, `services/languages/locales/en.json`, `es.json`, `editor.css` if needed

---

## Task 6: Editor doc switch and autosave

**Description:** Integrate nav into `render-editor.ts`: active doc state, flush before switch, remount ProseMirror with correct read/write bridge methods, hide AI chrome on worldbuilding.

**Acceptance criteria:**

- [ ] Open book defaults to manuscript (unchanged)
- [ ] Switching docs awaits dirty flush; failed flush keeps user on current doc with error
- [ ] Worldbuilding uses `readSupportDoc` / `writeSupportDoc`; manuscript unchanged
- [ ] Add AI comment hidden on worldbuilding; visible on desktop manuscript only

**Verification:**

- [ ] `bun run test packages/ui`
- [ ] Manual: create → type → switch → shelf → reopen

**Dependencies:** Tasks 3, 4, 5

**Files:** `packages/ui/src/editor/render-editor.ts`

---

## Task 7: UI unit tests (switch / create)

**Description:** Vitest coverage for create flow and switch-with-flush using mock bridge.

**Acceptance criteria:**

- [ ] Test: create worldbuilding from inline CTA calls `createSupportDoc` then shows editor
- [ ] Test: switch calls flush before loading other doc (mock flush/save order)

**Verification:**

- [ ] `bun run test packages/ui/src/editor`

**Dependencies:** Task 6

**Files:** colocated `*.test.ts` under `packages/ui/src/editor/`

---

## Task 8: E2E support-docs flow

**Description:** Playwright flow: new book → open → create worldbuilding → type → switch to manuscript → back to shelf → reopen → worldbuilding text persists.

**Acceptance criteria:**

- [ ] `e2e/flows/support-docs.spec.ts` passes in CI harness
- [ ] Helpers added only if needed in `e2e/helpers/ui.ts`

**Verification:**

- [ ] `bun run e2e e2e/flows/support-docs.spec.ts`
- [ ] `bun run test` and `bun run lint`

**Dependencies:** Task 6

**Files:** `e2e/flows/support-docs.spec.ts`, `e2e/helpers/ui.ts`

---

## Checkpoint (after Task 8)

- [ ] All slice 1 success criteria in `SPEC-support-docs.md`
- [ ] Ready for `/build auto` completion review and `/review` / `/ship`
>>>>>>> 096911b (build(support-docs): extend JanusBridge and mock (task 2))
