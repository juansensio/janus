# Spec: pdf-export

> Status: **Slice 1 approved** (2026-10-19). Module id `pdf-export` from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md) (to be updated at build). Depends on shipped **shell** (Electron desktop), **manuscript** (HTML on disk), and **library** (book title). Desktop only in slice 1.

Writers export the **currently open book** from the manuscript editor to a single readable PDF with minimal typography (title + body paragraphs).

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. “Open manuscript” means the book open in the editor; export uses on-disk HTML after flushing any pending autosave.
2. PDF body includes only `janus-p` blocks in document order. `janus-ai-comment` and `janus-ai-draft` are omitted (not reader-facing).
3. Empty manuscript (no paragraphs) still exports a valid PDF with the book title only.
4. Layout is one continuous scroll (no chapter breaks, headers, or footers in slice 1). Page size is **A4** for `printToPDF` and print CSS.
5. User picks the save path via the native save dialog; default filename derives from the book title + `.pdf`.
6. Generation uses Electron `webContents.printToPDF` on a short-lived hidden window loading domain-built print HTML (no new PDF npm dependency).
7. Mobile rejects `exportManuscriptPdf` with `PDF_EXPORT_NOT_SUPPORTED`.
8. E2E sets `JANUS_E2E_AUTO_PDF_PATH` to skip the save dialog. By default e2e writes a minimal stub PDF (headless `printToPDF` can hang in CI). Set `JANUS_E2E_USE_REAL_PDF=1` to exercise Chromium print in e2e locally.
9. Slice 1 entry is the editor **Export PDF** button only (no File menu).
→ Approved by orchestrator 2026-10-19.
```

## Objective

A writer on desktop exports their book to a PDF they can open elsewhere (email, print shop, beta readers) without leaving Janus.

### User stories

- As a writer, I click **Export PDF** in the editor and save a readable PDF of my manuscript.
- As a writer, if I cancel the save dialog, nothing is written and the editor stays as-is.
- As a writer with an empty page, I can still export a PDF that shows my book title.

### Acceptance criteria (slice 1)

- `@janus/pdf-export` owns print HTML (title, paragraph text, minimal CSS with A4 `@page`) from canonical manuscript HTML.
- Bridge exposes `exportManuscriptPdf(bookId: string)` → `{ outcome: "saved"; path: string } | { outcome: "cancelled" }`. Failures use stable codes: `BOOK_NOT_FOUND`, `MANUSCRIPT_READ_FAILED`, `MANUSCRIPT_INVALID`, `PDF_EXPORT_FAILED`, `PDF_EXPORT_NOT_SUPPORTED` (mobile).
- Desktop IPC reads manuscript + title, shows save dialog (or `JANUS_E2E_AUTO_PDF_PATH`), writes PDF bytes with **A4** `printToPDF` options.
- Editor chrome (desktop only): **Export PDF** button; flushes autosave before export; inline error on failure (not shelf banner).
- i18n keys for button label and export errors in `en` / `es`.
- `bun run test` and `bun run lint` pass; e2e covers export button → file exists when auto-path env is set.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Content in PDF | `janus-p` only | Comments and drafts are workflow artifacts, not reader text |
| Empty book | Title-only PDF allowed | Writer can share a named shell document |
| PDF engine | Electron `printToPDF` | No new dependency; uses Chromium layout |
| Page size | A4 | Orchestrator requirement |
| Print HTML owner | `services/pdf-export/` | Invariant 10–12: domain owns transforms; shell does IO |
| Entry point | Editor button only (slice 1) | File menu deferred |
| Filename | Sanitized book title + `.pdf` | Matches writer mental model |
| Zoom at export | Ignored (print at 100% layout) | PDF is device-independent; editor zoom is preview-only |

## Tech stack

Same as Janus (`SPEC-shell.md`): TypeScript, Bun, Vitest, `@janus/bridge`, vanilla UI in `packages/ui`, Electron desktop shell.

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
E2E:         bun run e2e e2e/flows/pdf-export.spec.ts
```

Domain-only:

```
bun run test services/pdf-export
```

## Project structure

```
services/pdf-export/
  package.json
  index.ts
  manuscript-print-html.ts
  manuscript-print-html.test.ts
  pdf-filename.ts
  pdf-filename.test.ts

packages/bridge/src/
  index.ts                 → exportManuscriptPdf on JanusBridge
  mock-janus-bridge.ts

apps/desktop/src/
  pdf-export-ipc.ts
  print-html-to-pdf.ts
  main.ts                  → register IPC
  preload.ts

apps/mobile/src/
  native-bridge.ts         → reject PDF_EXPORT_NOT_SUPPORTED

packages/ui/src/editor/
  render-editor.ts         → Export PDF button + handler

services/languages/locales/
  en.json, es.json
```

## Code style

Match `AGENTS.md` and existing domain modules: plain functions, named exports, four-space indent, double quotes, semicolons. Domain takes and returns plain values; no Electron imports in `services/pdf-export`.

## Testing strategy

| Area | What | How |
|------|------|-----|
| Domain | Print HTML, paragraph filter, title-only, filename | Vitest `services/pdf-export` |
| Desktop IPC | read + dialog + write | Vitest with mocked `printToPDF` / env auto-path |
| Desktop PDF | A4 pageSize in `printToPDF` | Unit smoke or IPC test with mock |
| Bridge mock | cancelled default or saved stub | Vitest |
| UI | Button visible desktop only; flush before export | Vitest `render-editor` / flow tests |
| E2E | Export creates non-empty PDF | Playwright + `JANUS_E2E_AUTO_PDF_PATH` |

## Boundaries

- **Always do:** Keep PDF layout logic in `services/pdf-export`; shells only IO and Electron APIs. Flush autosave before export.
- **Ask first:** New npm PDF libraries; mobile export; batch/shelf export; including AI comments or drafts in PDF; File menu export.
- **Never do:** Embed shelf rules in UI; export without persisting pending editor changes.
