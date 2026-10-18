# Library module — slice 1b (Neo-inspired shelf visual)

**Source spec:** `docs/specs/SPEC-library.md` — Slice 1b  
**Plan:** `tasks/plan.md`  
**Archived:** `tasks/archive/library/` (slice 1 CRUD)

Sizing: **S** = 1–2 files, **M** = 3–5 files.

**Out of scope:** bridge/domain changes, multi-shelf, Import, cover images, open book, custom delete modal, new CSS frameworks.

---

## Task 1: Shelf CSS tokens and global dark shell

**Description:** Add `packages/ui/src/styles/shelf.css` with design tokens (near-black background, gold wordmark, shelf rule, card 2:3, track flex + horizontal overflow, dashed add tile, cover modifier classes, error/empty/sr-only utilities). Import the stylesheet from `packages/ui/src/shell-entry.ts`. Apply dark background to `body` / `#app` via classes set in `mount.ts` or shelf root (e.g. `janus-shelf-shell` on `#app`).

**Acceptance criteria:**

- [x] CSS file exists and is imported from UI entry so `bun run build:ui` includes styles in built artifacts
- [x] No new npm dependencies for styling
- [x] Card width uses `rem`; palette defines at least 8 `.shelf-cover--*` modifier classes

**Verification:**

- [x] `bun run build:ui`
- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** None

**Files likely touched:** `packages/ui/src/styles/shelf.css`, `packages/ui/src/shell-entry.ts`, `packages/ui/src/mount.ts` (optional shell class)

**Estimated scope:** S

---

## Task 2: Cover palette helper

**Description:** Add `packages/ui/src/shelf/cover-palette.ts` with `coverClassForBookId(id: string)` per spec (stable hash into fixed class list). Colocated `cover-palette.test.ts` asserts same id → same class, different ids can differ.

**Acceptance criteria:**

- [x] Pure function; no DOM or bridge imports
- [x] Unit tests cover stability and bounds

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** Task 1 (CSS modifier class names must match palette output)

**Files likely touched:** `packages/ui/src/shelf/cover-palette.ts`, `packages/ui/src/shelf/cover-palette.test.ts`

**Estimated scope:** S

---

## Task 3: Neo-style shelf markup and behavior

**Description:** Refactor `render-shelf.ts`: shelf header with spaced gold wordmark (`createShellLabel()`), **BOOKS** label, horizontal `<ul class="shelf-track">` of cover cards (uppercase title, `title` attr, cover class from palette), icon delete with existing confirm flow, dashed add tile calling `createBook()`. Remove top toolbar **New book** button. Load errors unchanged; empty list shows add tile + visually hidden empty message. No `<a>` on cards; default cursor.

**Acceptance criteria:**

- [x] Matches slice 1b acceptance criteria in spec (chrome, row, cards, add tile, delete icon)
- [x] Still no title allocation or sorting in UI
- [x] `SHELF_STRINGS` updated (`shelfLabel`, `addBook` aria label, etc.)

**Verification:**

- [x] `bun run test`
- [x] Manual: `bun run dev:desktop` — visual spot-check against reference

**Dependencies:** Tasks 1, 2

**Files likely touched:** `packages/ui/src/shelf/render-shelf.ts`, `packages/ui/src/shelf/strings.ts`, `packages/ui/src/shelf/index.ts` (if re-exports)

**Estimated scope:** M

---

## Task 4: Mount wiring (wordmark in shelf only)

**Description:** `mountJanusShell` removes standalone `<h1>Janus</h1>`; only `section.janus-shelf` hosts `renderShelf` (header inside shelf). Keep `root.dataset.platform`. Update `mount.test.ts` to assert wordmark inside shelf chrome (e.g. `.shelf-wordmark`) and single heading.

**Acceptance criteria:**

- [x] No duplicate headings outside shelf
- [x] `data-platform` still on `#app` root
- [x] `mount.test.ts` updated and passing

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** Task 3

**Files likely touched:** `packages/ui/src/mount.ts`, `packages/ui/src/mount.test.ts`

**Estimated scope:** S

---

## Task 5: Shelf unit tests

**Description:** Update `packages/ui/src/shelf.test.ts` for new DOM: add tile triggers `createBook` (query `.shelf-add` or agreed class), N cards + 1 add tile, delete via card icon button, empty state uses sr-only empty text, no reliance on toolbar **New book** button.

**Acceptance criteria:**

- [x] All prior behaviors covered (create, delete confirm/cancel, load/create errors)
- [x] `bun run test` and `bun run lint` pass

**Verification:**

- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** Tasks 3, 4

**Files likely touched:** `packages/ui/src/shelf.test.ts`

**Estimated scope:** M

---

## Task 6: Install doc — shelf visual checks

**Description:** Update `docs/install-macos.md` library section: dark shelf, **BOOKS** row, + tile, cover cards, icon delete; remove references to plain **New book** toolbar and visible-only empty copy.

**Acceptance criteria:**

- [x] Manual steps match slice 1b UI
- [x] Still notes that `validate:install` is shell/toolchain only

**Verification:**

- [x] Read-through against running app

**Dependencies:** Task 5

**Files likely touched:** `docs/install-macos.md`

**Estimated scope:** S

---

## Task 7: Library slice 1b sign-off (human)

**Description:** Desktop + iOS Simulator visual pass (reference screenshot parity for layout/mood, not Neo branding). Confirm create/delete/persistence still work. Run `bun run validate:install`.

**Acceptance criteria:**

- [x] `bun run test`, `bun run lint`, `bun run validate:install` green
- [ ] Horizontal scroll with many books (optional: create 5+ books) — manual desktop/Simulator
- [ ] Persistence across restart — manual desktop/Simulator

**Verification:**

- [x] `bun run validate:install`
- [ ] Manual desktop + Simulator (writer)

**Dependencies:** Task 6

**Files likely touched:** `tasks/plan.md`, `tasks/todo.md` (checkpoint checkboxes)

**Estimated scope:** S (human)

---

## Checkpoint: Foundation (after Tasks 1–2)

- [x] CSS bundled (Task 1); cover palette tested (Task 2)

## Checkpoint: Shelf visual (after Tasks 3–5)

- [x] Unit tests green; dev desktop shows Neo-like shelf

## Checkpoint: Complete (after Tasks 6–7)

- [x] Install doc updated
- [ ] Human sign-off done (desktop + Simulator manual)
