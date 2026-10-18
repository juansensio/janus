# Library module — slice 1c (book naming)

**Source spec:** `docs/specs/SPEC-library.md` — Slice 1c  
**Plan:** `tasks/plan.md`  
**Archived:** `tasks/archive/library-slice-1b/` (slice 1b visual)

Sizing: **S** = 1–2 files, **M** = 3–5 files.

**Out of scope:** open book, unique titles, cover images, multi-shelf, `window.prompt`.

---

## Task 1: Library domain — title rules and shelf service API

**Description:** Add `services/library/book-title.ts` (`normalizeBookTitle`, `MAX_BOOK_TITLE_LENGTH`, `InvalidBookTitleError` / `INVALID_BOOK_TITLE`). Extend `ShelfServiceErrorCode` and mapping. Change `createBook(title: string)` to normalize the given title (no silent `allocateUntitledTitle` inside create — caller supplies title). Add `renameBook(id, title)` (read manifest, update title, write `book.json`). Add `suggestNewBookTitle()` on the service using `listBooks` + `allocateUntitledTitle`. Export helpers from `index.ts`. Update `library.test.ts` and shelf-service tests (including service-level tests if present).

**Acceptance criteria:**

- [x] `normalizeBookTitle` trims; rejects empty and >200 chars with `INVALID_BOOK_TITLE`
- [x] `createBook("Custom")` writes that title; `createBook` with default-style title from tests works
- [x] `renameBook` updates manifest; `BOOK_NOT_FOUND` / `INVALID_BOOK_ID` unchanged behavior
- [x] `suggestNewBookTitle` returns `Untitled` then `Untitled 2` when those titles exist

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** None

**Files likely touched:** `services/library/book-title.ts`, `services/library/shelf-service.ts`, `services/library/index.ts`, `services/library/library.test.ts`

**Estimated scope:** M

---

## Task 2: Bridge types and mock

**Description:** Update `JanusBridge`: `suggestNewBookTitle()`, `createBook(title: string)`, `renameBook(id, title)`. Add `INVALID_BOOK_TITLE` to `JanusBridgeErrorCode`. Update `createMockJanusBridge` defaults and any package tests that call `createBook()` with no args.

**Acceptance criteria:**

- [x] Types compile across workspace
- [x] Mock implements all three new/changed methods

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** Task 1

**Files likely touched:** `packages/bridge/src/index.ts`

**Estimated scope:** S

---

## Task 3: Desktop library IPC

**Description:** Register IPC for `suggestNewBookTitle`, `renameBook`; change `createBook` handler to accept `title` string. Wire `preload.ts`. Map `INVALID_BOOK_TITLE` through `library-errors` / `ShelfServiceError`. Update `library-ipc.test.ts` for custom create title, rename round-trip, and suggest default.

**Acceptance criteria:**

- [x] Preload exposes full `JanusBridge` library surface
- [x] Invalid title rejects with `INVALID_BOOK_TITLE`
- [x] Integration tests green

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** Tasks 1, 2

**Files likely touched:** `apps/desktop/src/library-ipc.ts`, `apps/desktop/src/preload.ts`, `apps/desktop/src/library-ipc.test.ts`

**Estimated scope:** M

---

## Task 4: Mobile native bridge

**Description:** Implement `suggestNewBookTitle`, `createBook(title)`, `renameBook` on `apps/mobile/src/native-bridge.ts`. Update `native-bridge.test.ts` and `library-fs.test.ts` for titled create and rename.

**Acceptance criteria:**

- [x] Mobile bridge matches desktop contract
- [x] Tests pass without Electron

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** Tasks 1, 2

**Files likely touched:** `apps/mobile/src/native-bridge.ts`, `apps/mobile/src/native-bridge.test.ts`, `apps/mobile/src/library-fs.test.ts`

**Estimated scope:** M

---

## Task 5: Book name dialog + styles

**Description:** Add `packages/ui/src/shelf/book-name-dialog.ts` (create vs rename headings, **Book name** field, Create/Save + Cancel, Escape + backdrop cancel, inline empty validation, focus field on open, return focus on close). Extend `shelf.css` for overlay/panel (dark theme). Add dialog strings to `strings.ts` per spec.

**Acceptance criteria:**

- [x] Dialog meets spec a11y attributes (`role="dialog"`, `aria-modal`, labelled heading)
- [x] Whitespace-only blocks confirm (disabled or inline message)
- [x] No `window.prompt`

**Verification:**

- [x] `bun run test` (add focused tests if colocated `book-name-dialog.test.ts`)
- [x] `bun run lint`

**Dependencies:** Task 2

**Files likely touched:** `packages/ui/src/shelf/book-name-dialog.ts`, `packages/ui/src/styles/shelf.css`, `packages/ui/src/shelf/strings.ts`

**Estimated scope:** M

---

## Task 6: Shelf integration and unit tests

**Description:** `render-shelf.ts`: + tile opens create dialog (`suggestNewBookTitle` → prefill → `createBook(title)`); add edit icon per card → rename dialog → `renameBook`. Style edit icon like delete (hover/focus). Update `shelf.test.ts`: add tile does **not** call `createBook` until dialog confirm; cancel leaves shelf unchanged; rename via `.shelf-card-edit` (or agreed class); errors show `.shelf-error`.

**Acceptance criteria:**

- [x] Matches slice 1c acceptance criteria in spec
- [x] Delete flow unchanged
- [x] UI still does not allocate or sort titles locally

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`
- [x] Manual: `bun run dev:desktop` — create with default Untitled, rename, cancel create

**Dependencies:** Tasks 3, 4, 5

**Files likely touched:** `packages/ui/src/shelf/render-shelf.ts`, `packages/ui/src/shelf.test.ts`, `packages/ui/src/styles/shelf.css`

**Estimated scope:** M

---

## Task 7: Install doc + slice 1c sign-off (human)

**Description:** Update `docs/install-macos.md` library steps: create dialog, edit icon rename, persistence. Manual desktop (+ Simulator if available): create with custom name, rename, restart app, confirm titles on disk.

**Acceptance criteria:**

- [x] Doc steps match UI
- [x] `bun run test`, `bun run lint`, `bun run validate:install` green
- [ ] Manual create/rename/persistence verified

**Verification:**

- [x] `bun run validate:install`
- [ ] Manual desktop (+ Simulator optional)

**Dependencies:** Task 6

**Files likely touched:** `docs/install-macos.md`

**Estimated scope:** S

---

## Task 8: Enter submits book-name dialog

**Description:** In `book-name-dialog.ts`, pressing **Enter** while focus is in the book name field submits the dialog the same way as clicking **Create** / **Save** (calls `onConfirm` with trimmed logic unchanged, closes on success). Whitespace-only title still does not submit. **Escape** and backdrop cancel stay as today. Prefer a semantic `<form>` + `submit` handler over duplicating confirm logic in multiple places.

**Acceptance criteria:**

- [x] With a valid title in the field, **Enter** creates or renames (same bridge calls as primary button)
- [x] **Enter** with whitespace-only title does not submit (inline validation unchanged)
- [x] **Escape** still closes without submit
- [x] Create and rename modes both behave the same for Enter

**Verification:**

- [x] `bun run test` — add or extend `shelf.test.ts` (or `book-name-dialog.test.ts`) simulating `keydown` Enter on `#shelf-book-name-input` and asserting `createBook` / `renameBook` called
- [x] `bun run lint`
- [ ] Manual: `bun run dev:desktop` — + tile → Enter with default Untitled; edit icon → change name → Enter

**Dependencies:** Task 6

**Files likely touched:** `packages/ui/src/shelf/book-name-dialog.ts`, `packages/ui/src/shelf.test.ts`

**Estimated scope:** S

---

## Checkpoint: Foundation (after Tasks 1–2)

- [x] Domain and bridge tests green

## Checkpoint: Adapters (after Tasks 3–4)

- [x] Shell tests green; IPC/mobile call titled create and rename

## Checkpoint: UI (after Tasks 5–6)

- [x] Shelf unit tests green; dev desktop smoke for dialog flows

## Checkpoint: Complete (after Task 7)

- [x] Install doc updated
- [ ] Human sign-off on create/rename/persistence

## Checkpoint: Dialog keyboard (after Task 8)

- [x] Enter submits; Escape still cancels; tests green

---

## Task 9: Show create/rename errors inside modal

**Description:** When `createBook` or `renameBook` fails while the book-name dialog is open, show the error **in the modal** (validation/error line under the field) and **do not** close the dialog or write `.shelf-error` on the shelf. Success still closes the dialog and re-renders the shelf. Duplicate title (`DUPLICATE_BOOK_TITLE`) behavior stays; extend the same path to generic and other bridge failures. Centralize code→message mapping in `book-name-dialog.ts` (or a tiny `dialog-bridge-errors.ts` colocated helper).

**Acceptance criteria:**

- [x] Failed create: modal stays open; inline message visible; no `.shelf-error` on shelf host
- [x] Failed rename: same as create with rename copy where appropriate
- [x] Successful create/rename: modal closes; shelf updates as today
- [x] `listBooks` / delete failures unchanged (may still use `.shelf-error` or confirm)
- [x] `DUPLICATE_BOOK_TITLE` still shows duplicate copy in modal

**Verification:**

- [x] `bun run test` — shelf test for generic `createBook` throw keeps dialog + inline error
- [x] `bun run lint`
- [ ] Manual: force a failure (e.g. temporarily break bridge) or use duplicate title — error only in modal

**Dependencies:** Task 8

**Files likely touched:** `packages/ui/src/shelf/book-name-dialog.ts`, `packages/ui/src/shelf/render-shelf.ts`, `packages/ui/src/shelf/strings.ts` (if new keys), `packages/ui/src/shelf.test.ts`

**Estimated scope:** S

---

## Checkpoint: Modal errors (after Task 9)

- [x] Create/rename errors inline; shelf banner not used for dialog submit failures
