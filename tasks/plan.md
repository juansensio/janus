# Implementation Plan: library (slice 1c — book naming)

**Source spec:** `docs/specs/SPEC-library.md` — **Slice 1c** (create dialog + rename)  
**Archived:** `tasks/archive/library-slice-1b/` (slice 1b visual; Task 7 manual sign-off optional)

## Overview

Add **named create** and **rename** on the dark shelf: **+** opens a modal (default `Untitled` / `Untitled N` from the bridge), **edit icon** on each card opens rename. Domain owns `normalizeBookTitle`, `createBook(title)`, `renameBook`, and `suggestNewBookTitle`; bridge and both shells expose new methods; UI owns an accessible dialog and card edit control. Delete, sort, and layout stay as slice 1b.

**Prerequisites:** Slice 1 CRUD (`tasks/archive/library/`), slice 1b shelf UI (code complete).

**Not in slice 1c:** Open book, unique-title enforcement, inline edit without modal, `window.prompt`.

## Architecture decisions

- **Breaking bridge change:** `createBook()` → `createBook(title: string)`; add `suggestNewBookTitle()` and `renameBook(id, title)`. Update mock bridge and all call sites in one vertical pass per shell.
- **Title validation:** `services/library/book-title.ts` with `INVALID_BOOK_TITLE` on `ShelfServiceError` (extend error code union in domain + `@janus/bridge`).
- **Create default:** UI calls `suggestNewBookTitle()` when opening create dialog; unchanged field + **Create** persists that `Untitled` name.
- **Rename affordance:** Icon-only edit on card (inline SVG); title stays `<h2>` text.
- **Dialog UX:** Custom modal in `book-name-dialog.ts`; backdrop click **cancels**; empty/whitespace shows **inline** validation; failed `createBook` / `renameBook` after confirm closes dialog and shows **`.shelf-error`** (same pattern as today).
- **Focus:** Return focus to + tile or edit button on close; `role="dialog"`, `aria-modal`, trap focus within dialog (minimal: focus field on open, Escape cancels).

## Dependency graph

```
Task 1 Domain: normalizeBookTitle + createBook(title) + renameBook + suggestNewBookTitle + tests
    → Task 2 Bridge contract + mock + INVALID_BOOK_TITLE
Task 1–2
    → Task 3 Desktop IPC/preload + library-ipc.test.ts
    → Task 4 Mobile native-bridge + tests
Checkpoint A (bridge callable from shells)
Task 2–4
    → Task 5 book-name-dialog.ts + shelf.css modal + dialog strings
    → Task 6 render-shelf wire create/rename + edit icon + shelf.test.ts
Checkpoint B (UI e2e in jsdom)
Task 6
    → Task 7 install doc + human sign-off
Task 8 (keyboard fix)
    book-name-dialog.ts — Enter submits when title valid
Task 9 (modal errors)
    All create/rename failures stay in dialog; no .shelf-error for those flows
```

## Task list

Full acceptance criteria: **`tasks/todo.md`** Tasks **1–9**.

### Phase 1: Domain and contract
- [x] Task 1: Library domain — title rules and shelf service API
- [x] Task 2: Bridge types and mock

### Checkpoint: Foundation
- [x] `bun run test` green for `@janus/library` and `@janus/bridge`

### Phase 2: Shell adapters
- [x] Task 3: Desktop library IPC
- [x] Task 4: Mobile native bridge

### Checkpoint: Adapters
- [x] Desktop + mobile tests pass; `createBook("My Book")` and `renameBook` work via service layer

### Phase 3: Shelf UI
- [x] Task 5: Book name dialog + styles
- [x] Task 6: Shelf integration and unit tests

### Checkpoint: UI
- [x] jsdom tests cover create (dialog + title arg), rename (edit icon), cancel paths

### Phase 4: Docs and sign-off
- [x] Task 7: Install doc + human verification (automated gates done)

### Phase 5: Dialog keyboard (manual QA follow-up)
- [x] Task 8: Enter submits create/rename dialog

### Phase 6: Dialog error UX
- [x] Task 9: Show create/rename errors inside modal

### Checkpoint: Complete
- [x] `bun run test` && `bun run lint` && `bun run build:ui`
- [ ] Manual create/rename/persistence on desktop (human)
- [x] Enter in dialog submits create/rename (Task 8; manual spot-check optional)

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking `createBook()` signature | Med | Task 2 updates mock + grep all call sites in same PR slice |
| Modal a11y incomplete in jsdom | Low | Test behavior (open, confirm, cancel); manual keyboard pass in Task 7 |
| Edit + delete icons crowd card | Low | Mirror delete positioning; CSS in shelf.css |
| IPC channel arity for createBook | Low | Pass `title` as first invoke argument; validate string in main |

## Open questions (resolved for build)

| Spec open question | Plan decision |
|--------------------|---------------|
| Backdrop click | Cancels (no create/rename) |
| API errors | **Superseded by Task 9:** inline in modal; shelf `.shelf-error` only for list/load/delete |
| Rename affordance | Edit icon (per spec decisions) |
| Create default | `suggestNewBookTitle()` prefill; Create without edit OK |

## Slice 1c follow-up (Task 9)

**Problem:** On create/rename failure, the modal closes and **Could not create/rename…** appears on the shelf (`.shelf-error`). **Duplicate title** already stays in the modal; other bridge errors do not.

**Cause:** `render-shelf.ts` `onConfirm` catches non-duplicate errors, calls `renderShelf` + `appendShelfError`, and completes without rethrowing — so `book-name-dialog.ts` closes the overlay.

**Approach:**

1. **`book-name-dialog.ts`** — On any `onConfirm` rejection, show message in `.shelf-dialog-validation` (or dedicated `.shelf-dialog-error`), keep modal open, refocus input. Map `DUPLICATE_BOOK_TITLE`, `INVALID_BOOK_TITLE`, and a mode-specific fallback (`createFailed` / `renameFailed`) from `error.code`; unknown codes use fallback.
2. **`render-shelf.ts`** — Create/rename `onConfirm`: success → `renderShelf` then return (dialog closes). Failure → **rethrow** the bridge error (or a thin wrapper); do **not** `appendShelfError` for these paths. Remove duplicate-only branch once dialog handles all codes.
3. **Shelf errors** — `.shelf-error` remains for `listBooks` load failure and delete/create **outside** the dialog only.
4. **Tests** — `shelf.test.ts`: failed `createBook` (generic throw) leaves dialog open, shows inline message, host has no `.shelf-error`. Rename parity test optional.

**Out of scope:** Mapping every future bridge code to custom copy (fallback string is enough).

## Human approval

**`/build`** for Task 9. Tasks 1–8 done; duplicate-title domain work may land in the same PR if still uncommitted.
