# Active plan: support-docs slice 1

**Source spec:** [`docs/specs/SPEC-support-docs.md`](../docs/specs/SPEC-support-docs.md)

**Archived:** zoom slice 2 (complete) → [`tasks/archive/zoom-slice-2/`](archive/zoom-slice-2/)

## Overview

A book becomes a small **project**: existing **manuscript** (unchanged open path) plus optional **worldbuilding** notes at `support/worldbuilding.md` (plain UTF-8). Writers switch via **Manuscript | Worldbuilding** in the editor chrome; missing worldbuilding shows an inline **Create** control. Bridge carries **editor HTML**; `@janus/support-docs` converts plain ↔ paragraph-only manuscript HTML. AI comment UI stays on the manuscript only.

**Prerequisites:** library (open book), manuscript (HTML editor + autosave), languages (`en` / `es`).

## Architecture decisions

- **Module boundary:** `services/support-docs/` owns kind registry, `support/<kind>.md` paths, atomic plain writes, and `plainTextToEditorHtml` / `editorHtmlToPlainText` using `@janus/manuscript` migration helpers. No `@janus/library` import in domain; shells resolve book directory like manuscript IPC.
- **Bridge:** `listSupportDocs`, `createSupportDoc`, `readSupportDoc`, `writeSupportDoc` on `JanusBridge` with new error codes; mock in-memory store keyed by `bookId:kind`.
- **UI:** New `editor-project-nav.ts` (segmented control + create panel). `render-editor.ts` owns active doc state, teardown/remount on switch, flush autosave before switch, `showAiChrome` only for manuscript.
- **Create flow:** `listSupportDocs` reports `exists: false`; selecting Worldbuilding shows inline Create → `createSupportDoc` → load empty editor HTML.
- **Out of scope this slice:** CAPABILITY-MAP / queue rows, extra kinds, templates, side-by-side panes.

## Dependency graph

```
Task 1: @janus/support-docs domain + Vitest
    → Task 2: bridge types + mock
        → Task 3: desktop IPC + adapter + tests
        → Task 4: mobile bridge wiring + tests
            → Task 5: editor project nav + i18n
                → Task 6: render-editor doc switch + create + flush
                    → Task 7: UI Vitest (nav / switch)
                        → Task 8: e2e support-docs flow
```

Build order follows the graph. Each task leaves `bun run test` and `bun run lint` green before the next commit.

## Task list

Full acceptance criteria: **`tasks/todo.md`** Tasks **1–8**.

### Phase 1: Domain and contract

- [x] Task 1: `services/support-docs` package
- [x] Task 2: `JanusBridge` support-doc methods + mock

**Checkpoint:** `bun run test services/support-docs packages/bridge` passes.

### Phase 2: Shells

- [x] Task 3: Desktop support-docs IPC + preload + Vitest
- [x] Task 4: Mobile `native-bridge` + Capacitor FS adapter

**Checkpoint:** Desktop + mobile bridge tests pass; no UI changes yet.

### Phase 3: Editor UX

- [x] Task 5: Project nav component + `en.json` / `es.json`
- [x] Task 6: `render-editor` integration (switch, create, AI gating)

**Checkpoint:** Manual smoke — open book, create worldbuilding, type, switch to manuscript and back.

### Phase 4: Verification

- [x] Task 7: Colocated UI Vitest for nav and switch behavior
- [x] Task 8: E2E `e2e/flows/support-docs.spec.ts`

**Checkpoint:** `bun run test`, `bun run lint`, `bun run e2e e2e/flows/support-docs.spec.ts` green.

## Risks

| Risk | Mitigation |
|------|------------|
| Editor remount drops zoom or focus | Reuse existing zoom mount once per book session; only remount scrollport/editor surface on doc switch |
| Stale autosave on fast switch | Await `flush()` before tearing down editor; block nav while flush in flight |
| AI blocks in support HTML | Domain rejects write when HTML contains non-`janus_p` blocks (`SUPPORT_DOC_INVALID`) |
