# Implementation Plan: manuscript (slice 1 — open, write, autosave)

**Source spec:** `docs/specs/SPEC-manuscript.md` — Slice 1  
**Archived:** `tasks/archive/library-slice-1d/` (library slice 1d wrapping shelf; shelf work complete per human)  
**Closed:** 2026-10-18 — manual verification passed (human)

## Overview

Deliver library **slice 2** behavior in the **manuscript** module: clicking a book card opens a single plain-text editor backed by `books/<id>/manuscript.md`, with 1s throttled autosave and an immediate flush when the writer taps **Shelf**. The shell shows shelf **or** editor, never both. Domain rules stay in `services/manuscript/`; path and book existence checks use `@janus/library` helpers from shell code only; `packages/ui` calls the bridge only.

**Prerequisites:** Shell signed off; library slice 1c+ (shelf CRUD, naming, dark shelf, wrap track) shipped.

## Architecture decisions

- **Module boundary:** `services/manuscript/` owns `MANUSCRIPT_FILENAME`, read/write, and atomic replace-via-temp-file. It does **not** import `@janus/library`. Shell adapters resolve `libraryBooksDir` + `validateBookId`, verify the book directory exists (e.g. readable `book.json`), then call manuscript with the book directory path.
- **Bridge:** Add `readManuscript(id)` and `writeManuscript(id, text)` to `JanusBridge` with codes `MANUSCRIPT_READ_FAILED` / `MANUSCRIPT_WRITE_FAILED` plus existing `INVALID_BOOK_ID` / `BOOK_NOT_FOUND`. Reuse desktop IPC reject shape (`library-ipc-error.ts` pattern).
- **UI routing:** Extend `mountJanusShell` (or a thin orchestrator it calls) to swap between `renderShelf` and `renderEditor`. Opening passes `BookSummary` (id + title from shelf list); editor loads text via `readManuscript`.
- **Autosave:** Pure scheduling logic colocated under `packages/ui/src/editor/` (testable without DOM where possible). At most one `writeManuscript` per second while dirty; reconcile in-flight writes so stale payloads do not clear dirty state; **Shelf** awaits flush when dirty.
- **Shelf cards:** Main card surface is activatable (`button` or `role="button"` + keyboard) with label `Open {title}`; edit/delete buttons keep `stopPropagation` so they never open the editor.
- **Styling:** New `editor.css` alongside shelf tokens (dark chrome, no new font, `<textarea>` not a rich-text dependency).
- **Spec status:** `SPEC-manuscript.md` is marked not approved in the file; treat this `/plan` as intent to build slice 1. Task 7 records approval + `CAPABILITY-MAP.md` footnote per spec.

## Dependency graph

```
Task 1: @janus/manuscript domain + tests
    → Task 2: bridge contract + mock
        → Task 3: desktop IPC + adapter
        → Task 4: mobile native bridge
            → Task 5: shelf open + mount routing + editor load/display
                → Task 6: autosave, flush, errors + UI tests
                    → Task 7: docs + manual journey
```

## Task list

Full acceptance criteria: **`tasks/todo.md`** Tasks **1–7**.

### Phase 1: Domain and contract
- [x] Task 1: `services/manuscript` read/write + Vitest
- [x] Task 2: `JanusBridge` manuscript methods + mock store

### Checkpoint: Contract
- [x] `bun run test` green for manuscript + bridge packages
- [x] Mock bridge round-trips text per book id

### Phase 2: Shells
- [x] Task 3: Desktop manuscript IPC + preload + tests
- [x] Task 4: Mobile `native-bridge` manuscript methods + tests

### Checkpoint: Shells
- [x] Desktop and mobile tests pass; invalid/missing id reject with stable `code`

### Phase 3: Writer flow
- [x] Task 5: Card opens editor; load failure UX; editor chrome + styles
- [x] Task 6: Autosave (1s), Shelf flush, save failure stays on editor

### Checkpoint: Core flow
- [x] UI tests cover open, autosave rate, flush, failed save
- [x] Manual: type, return to shelf, reopen, quit/relaunch (desktop)

### Phase 4: Sign-off
- [x] Task 7: Approve spec status, CAPABILITY-MAP footnote, `install-macos.md` manuscript steps

### Checkpoint: Complete
- [x] `bun run test` && `bun run lint`
- [x] Rename/delete on shelf unchanged; delete removes `manuscript.md` with book dir

## Out of scope

Chapters, section breaks, `languages`, rich-text/markdown preview, AI assist, creating `manuscript.md` on book create, changing `book.json`.
