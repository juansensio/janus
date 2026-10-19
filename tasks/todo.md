# Active todo (pointer)

**Active slice:** `tasks/jobs/pdf-export/slice-1/todo.md` — **all tasks complete** (PR #5).

<<<<<<< HEAD
| # | Task | Status |
|---|------|--------|
| 1 | Domain `@janus/pdf-export` | done |
| 2 | Bridge and desktop PDF IPC | done |
| 3 | Editor UI and mobile stub | done |
| 4 | E2E and release gate | done |
=======
**Archived:** zoom slice 2 → [`tasks/archive/zoom-slice-2/`](archive/zoom-slice-2/)

## Task 1: Domain module `@janus/pdf-export`

**Description:** Add `services/pdf-export` to turn manuscript HTML into A4-oriented print HTML and a safe default filename.

**Acceptance criteria:**
- [x] `collectPrintParagraphs` / `buildManuscriptPrintHtml` include only `janus-p`; omit comments and drafts
- [x] Title-only HTML when there are zero paragraphs (empty manuscript root OK)
- [x] Print HTML includes `@page { size: A4; }` (or equivalent A4 hint in CSS)
- [x] `suggestedPdfFilename` strips unsafe path characters; falls back to `Untitled.pdf`
- [x] `CAPABILITY-MAP.md` adds `pdf-export` module row and slice 1 prose

**Verification:**
- [x] `bun run test services/pdf-export`
- [x] `bun run lint`

**Dependencies:** None

**Files likely touched:**
- `services/pdf-export/*`
- `CAPABILITY-MAP.md`
- `bun.lock` (workspace link)

**Estimated scope:** Medium

---

## Task 2: Bridge contract and desktop PDF pipeline

**Description:** Expose `exportManuscriptPdf` on the bridge; implement A4 `printToPDF` helper and IPC handler with save dialog / e2e auto-path.

**Acceptance criteria:**
- [x] `JanusBridge.exportManuscriptPdf`, `PdfExportResult`, error codes on `@janus/bridge`
- [x] Mock bridge implements method (e.g. default `cancelled`)
- [x] `print-html-to-pdf.ts` uses Node-compatible imports; `pageSize: "A4"` in `printToPDF`
- [x] `pdf-export-ipc.ts` loads title + manuscript, writes PDF; `JANUS_E2E_AUTO_PDF_PATH` bypasses dialog
- [x] Registered in `main.ts` and `preload.ts`; `@janus/pdf-export` in desktop `package.json`
- [x] Vitest IPC test with mocked `printHtmlToPdfBuffer`

**Verification:**
- [x] `bun run test apps/desktop`
- [x] `bun run --filter @janus/desktop build`

**Dependencies:** Task 1

**Files likely touched:**
- `packages/bridge/src/index.ts`, `mock-janus-bridge.ts`
- `apps/desktop/src/pdf-export-ipc.ts`, `print-html-to-pdf.ts`, `main.ts`, `preload.ts`, `package.json`

**Estimated scope:** Medium

---

## Task 3: Editor UI and mobile stub

**Description:** Desktop editor **Export PDF** button with autosave flush; localized strings; mobile rejects export.

**Acceptance criteria:**
- [x] `.editor-export-pdf` visible on desktop only; hidden on mobile
- [x] Click: flush if dirty → `exportManuscriptPdf`; cancelled is silent; failure shows inline `.editor-error`
- [x] `manuscript.exportPdf` and `manuscript.exportPdfFailed` in `en.json` / `es.json`
- [x] Minimal header styles for export button
- [x] `native-bridge.ts` throws `PDF_EXPORT_NOT_SUPPORTED`

**Verification:**
- [x] `bun run test packages/ui`
- [x] `bun run test apps/mobile`

**Dependencies:** Task 2

**Files likely touched:**
- `packages/ui/src/editor/render-editor.ts`, `packages/ui/src/styles/editor.css`
- `services/languages/locales/en.json`, `es.json`
- `apps/mobile/src/native-bridge.ts`

**Estimated scope:** Small

---

## Task 4: E2E and release gate

**Description:** Playwright flow proves export writes a non-empty PDF via auto-path env.

**Acceptance criteria:**
- [x] `e2e/helpers/launch.ts` sets `JANUS_E2E_AUTO_PDF_PATH` on isolated dirs
- [x] `e2e/flows/pdf-export.spec.ts`: create book, type text, export, assert file size > 0
- [x] Optional: title-only export case in Vitest (Task 1) already covers empty body

**Verification:**
- [x] `bun run test`
- [x] `bun run lint`
- [x] `bun run e2e e2e/flows/pdf-export.spec.ts`

**Dependencies:** Task 3

**Files likely touched:**
- `e2e/flows/pdf-export.spec.ts`, `e2e/helpers/launch.ts`, `e2e/helpers/ui.ts`

**Estimated scope:** Small

---

## Checkpoint (after Task 4)

- [ ] All slice 1 acceptance criteria in `SPEC-pdf-export.md`
- [ ] Ready for `/build` (one commit per task when implementing)
>>>>>>> 543a2c7 (build(pdf-export): e2e export flow and CI PDF stub (task 4))
