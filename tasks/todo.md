# Manuscript module — slice 1 (open, write, autosave)

**Source spec:** `docs/specs/SPEC-manuscript.md` — Slice 1  
**Plan:** `tasks/plan.md`  
**Archived:** `tasks/archive/library-slice-1d/` (library wrapping shelf)

Sizing: **S** = 1–2 files, **M** = 3–5 files.

**Out of scope:** chapters, `languages`, rich-text editor, AI, `book.json` fields.

---

## Task 1: Manuscript domain service

**Description:** Add `services/manuscript/` (`@janus/manuscript`): export `MANUSCRIPT_FILENAME`, `ManuscriptFs`, `createManuscriptService` with `read(bookDir)` (missing file → `""`) and `write(bookDir, text)` (atomic temp + rename). Vitest covers round-trip, Unicode/blank lines, replace, no leftover temp file, and that `book.json` is untouched.

**Acceptance criteria:**

- [x] Missing `manuscript.md` reads as empty string without creating a file
- [x] Write creates file on first save; subsequent writes replace content
- [x] Successful write leaves no temp file in the book directory

**Verification:**

- [x] `bun run test` (`services/manuscript/manuscript.test.ts`)
- [x] `bun run lint`

**Dependencies:** None

**Files likely touched:** `services/manuscript/index.ts`, `services/manuscript/manuscript-service.ts`, `services/manuscript/manuscript.test.ts`, `services/manuscript/package.json`, root/workspace `package.json` if needed

**Estimated scope:** M

---

## Task 2: Bridge contract and mock

**Description:** Extend `@janus/bridge`: add `MANUSCRIPT_READ_FAILED` and `MANUSCRIPT_WRITE_FAILED` to `JanusBridgeErrorCode`; add `readManuscript` / `writeManuscript` to `JanusBridge`; implement in-memory per-id storage in `createMockJanusBridge`. Add Vitest for mock round-trip.

**Acceptance criteria:**

- [x] `JanusBridge` includes both manuscript methods with documented reject codes
- [x] Mock stores text per book id; missing id reads as `""`

**Verification:**

- [x] `bun run test` (`packages/bridge`)
- [x] `bun run lint`

**Dependencies:** Task 1

**Files likely touched:** `packages/bridge/src/index.ts`, `packages/bridge/src/index.test.ts`

**Estimated scope:** S

---

## Task 3: Desktop manuscript IPC

**Description:** Wire desktop shell: `manuscript-service.ts` adapter (Node `path` + `@janus/manuscript`), resolve book dir via `@janus/library` (`validateBookId`, `libraryBooksDir`), `BOOK_NOT_FOUND` when manifest missing, `registerManuscriptIpc` mirroring `library-ipc.ts`, preload + `main.ts` registration. Vitest for read/write, `INVALID_BOOK_ID`, `BOOK_NOT_FOUND`, and FS failure mapping.

**Acceptance criteria:**

- [x] Preload exposes `readManuscript` / `writeManuscript` on `window.janus`
- [x] Invalid id and missing book reject before manuscript I/O
- [x] Read/write hit real `manuscript.md` under user library root in integration-style tests

**Verification:**

- [x] `bun run test` (`apps/desktop` manuscript IPC tests)
- [x] `bun run lint`

**Dependencies:** Task 2

**Files likely touched:** `apps/desktop/src/manuscript-service.ts`, `apps/desktop/src/manuscript-ipc.ts`, `apps/desktop/src/manuscript-ipc.test.ts`, `apps/desktop/src/preload.ts`, `apps/desktop/src/main.ts`, shared error helper if reused

**Estimated scope:** M

---

## Task 4: Mobile native bridge

**Description:** Add the same two methods to `apps/mobile/src/native-bridge.ts` using Capacitor FS (new `manuscript-fs.ts` adapter if needed) and the same book-dir guard pattern as desktop. Extend `native-bridge.test.ts`.

**Acceptance criteria:**

- [x] Mobile `window.janus` implements manuscript read/write
- [x] Tests cover forward to manuscript service with mock FS

**Verification:**

- [x] `bun run test` (`apps/mobile`)
- [x] `bun run lint`

**Dependencies:** Task 2

**Files likely touched:** `apps/mobile/src/native-bridge.ts`, `apps/mobile/src/manuscript-fs.ts`, `apps/mobile/src/native-bridge.test.ts`

**Estimated scope:** M

---

## Task 5: Shelf open + editor shell

**Description:** UI orchestration: `mount.ts` shows shelf or editor. Shelf: make each book card open the editor (accessible control, `manuscript.openBook` copy); edit/delete unchanged. Editor: **Shelf** back (no write yet on load failure), read-only title, status region, `<textarea>` with loaded text, focus at end, dark `editor.css`. Load failure shows `manuscript.loadFailed` and **Shelf** only.

**Acceptance criteria:**

- [x] Clicking the card (not edit/delete) opens the editor for that book
- [x] Successful load shows title + textarea content from `readManuscript`
- [x] Load error shows inline message; **Shelf** returns to shelf without calling write

**Verification:**

- [x] `bun run test` (editor open + load failure cases)
- [x] `bun run lint`
- [ ] Manual: open book with no `manuscript.md` → empty field; **Shelf** → no new file on disk

**Dependencies:** Tasks 2–4 (mock bridge sufficient for UI tests; shells for manual)

**Files likely touched:** `packages/ui/src/mount.ts`, `packages/ui/src/shelf/render-shelf.ts`, `packages/ui/src/editor/*`, `packages/ui/src/styles/editor.css`, import in UI entry

**Estimated scope:** M

---

## Task 6: Autosave and Shelf flush

**Description:** Implement dirty tracking, at-most-once-per-second `writeManuscript` while dirty, in-flight reconciliation, status strings (`Saving…` / `Saved` / save error). **Shelf** awaits immediate flush when dirty; failed flush keeps editor open with error and preserved text. Vitest: autosave interval, no write when clean, flush on **Shelf**, failed flush, reopen shows saved text.

**Acceptance criteria:**

- [x] Typing triggers saves at ≤1 Hz while dirty; no writes when text matches last successful save
- [x] **Shelf** flushes pending text before showing shelf; failed flush does not navigate away
- [x] Opening the same book again shows last saved text (including Unicode)

**Verification:**

- [x] `bun run test` (editor autosave tests)
- [x] `bun run lint`
- [ ] Manual: type, wait for Saved, shelf, reopen; kill app and relaunch

**Dependencies:** Task 5

**Files likely touched:** `packages/ui/src/editor/*`, `packages/ui/src/editor/*.test.ts`

**Estimated scope:** M

---

## Task 7: Spec approval and install journey

**Description:** Mark `SPEC-manuscript.md` slice 1 approved; add `CAPABILITY-MAP.md` footnote (manuscript slice 1 after library 1c, does not wait on `languages`). Add **Manuscript** section to `docs/install-macos.md` (open book, autosave, shelf round-trip, relaunch). Update `tasks/archive/README.md` with `library-slice-1d/` row.

**Acceptance criteria:**

- [x] Spec status and map footnote match shipped behavior
- [x] Install doc lists manual checks for slice 1 success criteria

**Verification:**

- [x] `bun run test` && `bun run lint`
- [ ] Manual walkthrough per install doc

**Dependencies:** Task 6

**Files likely touched:** `docs/specs/SPEC-manuscript.md`, `CAPABILITY-MAP.md`, `docs/install-macos.md`, `tasks/archive/README.md`

**Estimated scope:** S

---

## Checkpoint: Contract (after Tasks 1–2)

- [x] Domain + bridge tests green
- [x] Mock manuscript round-trip works

## Checkpoint: Shells (after Tasks 3–4)

- [x] Desktop + mobile tests green
- [x] Stable error `code` on bad id / missing book

## Checkpoint: Core flow (after Tasks 5–6)

- [x] UI tests green
- [ ] Desktop manual: create book → open → type → shelf → reopen → quit → relaunch → reopen

## Checkpoint: Complete (after Task 7)

- [x] Docs and map updated
- [ ] Shelf rename/delete/delete-dir behavior unchanged
