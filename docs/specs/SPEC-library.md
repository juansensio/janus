# Spec: library

> Status: **Slice 1 approved** (2026-10-18). **Slice 1b (Neo-inspired shelf visual)** — *approved for implementation* (plan: `tasks/plan.md`, 2026-10-18). **Slice 1c (book naming: create + rename)** — *approved for implementation* (plan: `tasks/plan.md`, 2026-10-18). Depends on signed-off **shell** (`docs/specs/SPEC-shell.md`). **Slice 1** ships **before** `languages` and `manuscript` per product direction; full “open and write” waits on `manuscript`.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Slice 1 runs on desktop and mobile shells once shell is signed off; both use the same `packages/ui` bookshelf screen.
2. UI copy is **English literals** in presentation until `languages` is integrated; catalog keys are listed for a later `languages` seed (no `services/languages` import in slice 1).
3. A **book** is a directory under the user library root with a small `book.json` manifest; no chapters or manuscript files yet.
4. **Create** is one click: new book with an auto-generated title (`Untitled`, then `Untitled 2`, …). No rename UI in slice 1.
5. **Delete** removes the book directory from disk after a single confirmation dialog.
6. **Open** a book (navigate to manuscript) is **out of scope** for slice 1; cards are not clickable navigations.
7. Library root on desktop is the OS app-data folder (e.g. `app.getPath("userData")/library`); on mobile, Capacitor Filesystem under app data. Exact paths are shell implementation details exposed only via bridge for tests.
8. Domain rules live in `services/library/`; shells perform I/O through **extended `JanusBridge`** methods; `packages/ui` only renders lists and forwards user actions.
→ Correct me now or approve and we proceed with these.
```

## Objective

The writer sees a **bookshelf**: a grid of **book cards**, a **New book** control, and a **delete** control on each card. They can **create** books and **delete** books. Books persist as **plain files on disk** (local-first, no accounts).

This module owns **which books exist**, **how they are named for the shelf**, and **how they are stored on disk**. It does not own interface translation (`languages`), page/chapter editing (`manuscript`), or AI actions (`ai-assist`).

### Phased delivery (this module)

| Phase | Outcome | Depends on |
|--------|---------|------------|
| **Slice 1 — Shelf CRUD** (approved) | List, create, delete books; minimal `book.json`; simple card UI | `shell` |
| **Slice 1b — Shelf visual (Neo-inspired)** | Dark chrome, horizontal shelf row, cover-style cards, dashed “add” tile; same CRUD as slice 1 | Slice 1 |
| **Slice 2 — Open book** | Selecting a card opens the manuscript for that book | `manuscript` |
| **Slice 3 — Arrange** | Multiple named shelves, reorder, `+ Shelf`, drag handles | Slice 2 + product rules |

`CAPABILITY-MAP.md` lists `library` after `manuscript` for the **full** Neo-style loop. Slice 1 is a deliberate vertical cut so the shelf exists early; update the map footnote when this spec is approved.

### User stories

- As a writer, when I open Janus, I see every book I have created as a card on the shelf.
- As a writer, I can press **New book** and a new card appears without leaving the shelf.
- As a writer, I can delete a book I no longer want; I am asked to confirm once; the book disappears from the shelf and from disk.

### Acceptance criteria (slice 1)

- Empty shelf shows zero cards and a visible **New book** control.
- **New book** creates a new on-disk book, appends a card, and does not require a network connection.
- Default titles are unique among existing books: `Untitled`, `Untitled 2`, `Untitled 3`, …
- Each card shows at least the book **title** (no cover art in slice 1).
- Delete control on a card opens a confirmation; **Cancel** leaves the book unchanged; **Delete** removes the book directory and the card.
- After restart (quit app and reopen), the same books appear in a stable order (sorted by `createdAt` ascending, then `id` lexicographic tie-break).
- All book identity and naming rules are implemented in `services/library/`; Electron/Capacitor code only reads/writes bytes and paths the domain returns.
- `packages/ui` does not compute titles, sort keys, or deletion rules; it displays values and calls bridge methods.
- Unit tests cover `services/library/` (title allocation, manifest parse/validate, sort order, delete guards). Bridge adapters have tests where pure (path join, error mapping).

## Tech Stack

- **TypeScript** (strict), **Bun** workspaces, **Vite** UI bundle per `SPEC-shell.md`.
- Domain: `services/library/` (pure TS, no Electron/Capacitor/DOM).
- Bridge: extend `@janus/bridge` `JanusBridge` with async library methods (see Contract).
- UI: vanilla TS in `packages/ui` (no new UI framework without ask-first).
- Tests: **Vitest** (+ jsdom for DOM mount tests).

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

Filter when workspace tags exist:

```
Test library domain: bun run test --filter @janus/library
```

## Project Structure

```
services/library/
  index.ts              → public API (summaries, create, delete, paths)
  book-manifest.ts      → parse/serialize book.json (slice 1 schema)
  titles.ts             → Untitled / Untitled N allocation
  library.test.ts       → unit tests

packages/bridge/
  src/index.ts          → JanusBridge + BookSummary types

packages/ui/
  src/mount.ts          → mountJanusShell (may delegate to shelf mount)
  src/shelf/            → bookshelf DOM (cards, new, delete) — names at implement time
  src/shelf-entry.ts    → wire bridge list/create/delete → re-render

apps/desktop/
  src/main.ts           → IPC handlers for library FS (or dedicated library-main.ts)
  src/preload.ts        → expose library methods on window.janus

apps/mobile/
  src/native-bridge.ts  → Capacitor Filesystem implementation of library methods

docs/specs/SPEC-library.md
CAPABILITY-MAP.md       → add footnote for slice 1 when approved
```

`services/manuscript/` is **not** created in slice 1. Manuscript will treat an existing `book.json` + folder as its entry point in a later spec.

## On-disk format (slice 1)

Library root (conceptual):

```
<libraryRoot>/
  books/
    <bookId>/
      book.json
```

`bookId`: lowercase UUID v4 string (generated in domain).

`book.json` (version 1):

```json
{
  "version": 1,
  "id": "<bookId>",
  "title": "Untitled",
  "createdAt": "2026-10-18T10:00:00.000Z"
}
```

- Only `services/library/` defines required fields and validation.
- Shells create/remove directories and read/write `book.json` as instructed by domain helpers (`serializeManifest`, `parseManifest`, `bookDirectoryName`, etc.).
- No `language` field until `languages` + `manuscript`; optional later migration adds it with defaults.

## Code Style

Match `SPEC-shell.md` and `AGENTS.md`: domain modules take and return plain values; no `window`, no `fs` in `services/library/`. Shell adapters are thin. Errors use stable `code` strings for tests.

**Domain (illustrative):**

```ts
export type BookSummary = {
  id: string;
  title: string;
  createdAt: string;
};

export function allocateUntitledTitle(existingTitles: string[]): string {
  const base = "Untitled";
  if (!existingTitles.includes(base)) return base;
  let n = 2;
  while (existingTitles.includes(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

export function sortBooksForShelf(books: BookSummary[]): BookSummary[] {
  return [...books].sort((a, b) => {
    const t = a.createdAt.localeCompare(b.createdAt);
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });
}
```

**UI:** build DOM with `document.createElement`; ARIA labels on icon-only delete; confirmation uses `window.confirm` in slice 1 (replace with accessible modal when `languages`/design system land).

## Contract

### Bridge (`JanusBridge` extension)

All methods return Promises. Reject with `Error` objects carrying `code` (string).

| Method | Behavior |
|--------|----------|
| `listBooks()` | Returns `BookSummary[]` for all valid books under `<libraryRoot>/books/`. Skips or surfaces corrupt entries per domain policy (default: skip corrupt, log in shell; unit-test policy in domain). |
| `createBook()` | Creates new book dir + `book.json`; returns new `BookSummary`. |
| `deleteBook(id)` | Validates `id`, deletes book directory recursively; throws `BOOK_NOT_FOUND` if missing. |

Existing `platform()` unchanged.

Type exports live in `@janus/bridge` so UI and shells share one shape.

### Domain public API (`services/library/index.ts`)

| Function | Role |
|----------|------|
| `sortBooksForShelf` | Ordering for UI |
| `allocateUntitledTitle` | New book title |
| `parseManifest` / `serializeManifest` | `book.json` |
| `validateBookId` | Safe path segment (no `..`, slashes) |
| `libraryBooksDir(libraryRoot)` | Path helper for shells |

Shells must not invent parallel manifest shapes.

### UI strings (English until `languages`)

| Key (future catalog) | Slice 1 English |
|------------------------|-----------------|
| `library.newBook` | New book |
| `library.empty` | No books yet |
| `library.delete` | Delete |
| `library.deleteConfirm` | Delete “{title}”? This cannot be undone. |

## Testing Strategy

| Level | What | Tool |
|--------|------|------|
| Unit | Title allocation, sort, manifest parse errors, id validation | Vitest in `services/library/` |
| Unit | Shelf mount: renders N cards, calls bridge on create/delete | Vitest + jsdom, bridge mocked |
| Integration | Desktop: create → list → delete round-trip on temp dir | Vitest with injected fs adapter or temp folder in main-process test harness |
| Mobile | Manual: same flows in Simulator after Capacitor FS impl | Install journey checklist |

Coverage gate: none until project sets one. Slice 1 is done when unit tests pass and manual desktop + Simulator checks in the library section of the install doc succeed.

## Boundaries

- **Always:** Run `bun run test` before treating library work complete. Keep manuscript and language rules out of `packages/ui` and shell except I/O and locale tags passed in later. One owning module: `services/library/`. Pin versions; commit `bun.lock`.
- **Ask first:** Changing library root location after release, import/export, cloud sync, book covers, drag-and-drop reorder, schema version migrations, new npm dependencies, React/Svelte UI framework.
- **Never:** Store book content only in memory without disk write. Delete without confirmation. Put pricing, AI, or locale resolution in `services/library/`. Duplicate manifest parsing in desktop and mobile.

## Success Criteria

- Documented dev commands run; bookshelf visible in `#app` on desktop and Simulator.
- Writer can create and delete books; persistence survives app restart.
- `services/library` tests green; UI shelf tests green with mocked bridge.
- `CAPABILITY-MAP.md` footnote documents slice 1 vs full library.

## Decisions (approved with spec)

1. **Library root:** App user-data (`userData` / Capacitor data directory) for slice 1; no “Choose folder” UI yet.
2. **Create flow:** One-click **New book** with auto `Untitled` / `Untitled 2` titles (assumption 4).
3. **Delete:** `window.confirm` (or platform-native equivalent via shell) for slice 1.
4. **Corrupt books:** Skip corrupt entries on the shelf; domain policy unit-tested; shell may log (assumption + domain table).
5. **Capability map:** **Library slice 1** (shelf CRUD only) may build after **shell**, before **languages** / **manuscript** — see `CAPABILITY-MAP.md` footnote.

---

**Next step:** **`/build`** from `tasks/todo.md` (active plan in `tasks/plan.md`). When this module ships, archive that pair to `tasks/archive/library/` before planning the next spec.

---

# Slice 1b — Neo-inspired shelf visual design

> **Reference:** Product screenshot (dark bookshelf UI with spaced gold wordmark, horizontal shelf rows, cover-style cards, dashed add tiles). Janus implements the **visual language**, not Neo feature parity.  
> **Scope:** Presentation in `packages/ui` only. No bridge, domain, or on-disk changes.

## Assumptions (slice 1b)

```
ASSUMPTIONS I'M MAKING:
1. **Brand** is **Janus** (from `createShellLabel()`), styled like the reference wordmark (wide letter-spacing, muted gold on dark), not the literal “NEO” string.
2. **One shelf row** labeled **BOOKS** (English literal until `languages`). Multi-shelf labels, `+ Shelf`, drag handles, and Import stay in slice 3 / later map items.
3. **No author line** on cards until manuscript adds author metadata; optional muted footer band may be omitted or left empty—no fake “Hugh Howey” placeholder.
4. **No cover images** in slice 1b. Cards use **presentation-only** cover colors derived from `book.id` (stable per book) in `packages/ui`—not in `services/library`.
5. **Create** is triggered by the **dashed “+” tile** at the end of the row (primary). A secondary text control in the header is optional for keyboard discoverability only.
6. **Delete** remains confirm-then-delete (`window.confirm`); control moves to an **icon** on the card (reference: small bar/minus), visible on focus and on hover-capable pointers.
7. **Open book** stays disabled (no navigation, no pointer “open” affordance beyond hover styling).
8. **CSS** ships as a dedicated stylesheet imported by the UI entry (`shell-entry.ts`); no new UI framework or CSS-in-JS dependency.
9. Desktop and mobile share the same markup and styles; narrow viewports use **horizontal scroll** on the card row (no reflow to a vertical grid).
→ Correct me now or approve slice 1b and we proceed to `/plan`.
```

## Objective (slice 1b)

Writers opening Janus see a **dark, Neo-like bookshelf**: app chrome with a gold **Janus** wordmark, a single horizontal **shelf** of **cover-shaped cards**, and a **dashed add tile**. Slice 1 behaviors (list, create, delete, persistence, sort order) are unchanged; only layout, typography, color, and control placement change.

### User stories

- As a writer, the shelf feels like a real bookshelf (vertical covers in a row), not a plain list with text buttons.
- As a writer, I add a book by clicking the **+** tile at the end of the row, consistent with the reference UI.
- As a writer, I can still delete a book with confirmation; the delete control does not dominate the cover art.

### Acceptance criteria (slice 1b)

**Chrome**

- Page background is near-black (`#0f0f0f`–`#141414` range); shelf separators use a subtle 1px horizontal rule.
- Top bar: **Janus** wordmark (serif or system serif stack), letter-spaced, gold/brass accent; no duplicate `<h1>` outside the shelf chrome (mount delegates header to shelf layout).
- Top bar does **not** show Import, user name, or `+ Shelf` (out of scope).

**Shelf row**

- One section with uppercase muted label **BOOKS** (future catalog key `library.shelf.default`).
- Books render in a single **horizontal row** with consistent gap; row scrolls horizontally when overflow (scrollbar styled subtly or native).
- Sort order unchanged: `createdAt` ascending, then `id` (domain list order as today).

**Book cards**

- Aspect ratio **2:3**, rounded corners (~6–8px), light drop shadow on dark background.
- Title shown in **uppercase** on the “cover” (truncate with ellipsis if needed; full title in `title` attribute / accessible name).
- Background color is **deterministic from `book.id`** via a pure function in `packages/ui` (fixed palette of ~8–12 hues matching reference saturation, not random per session).
- Cards are **not** links; `cursor` default except optional subtle hover lift/shadow (no “hand” open cursor).

**Add tile**

- Last item in the row: dashed border, centered **+**, same dimensions as a book card.
- Activating it calls `bridge.createBook()` (same as slice 1 **New book**).
- Empty library: row shows **only** the add tile (no separate “No books yet” paragraph, or that copy moves inside the shelf as visually hidden text for screen readers—pick one in implementation; see Open Questions).

**Delete**

- Icon-only delete on each card (ARIA label unchanged semantics); `window.confirm` before `deleteBook`.
- Failed create/delete/list still surfaces `.shelf-error` below chrome or shelf.

**Non-regression**

- All slice 1 domain and bridge tests remain green without changes unless selectors in UI tests must track renamed structure.
- `packages/ui` still does not allocate titles, sort, or parse manifests.

### Visual reference (implementation targets)

| Element | Target |
|--------|--------|
| Wordmark | Spaced caps, gold `#b8a066` ± tweak for contrast on dark bg |
| Shelf label | 11–12px, uppercase, `#6b6b6b`, generous top/bottom margin |
| Card width | ~140–160px at default desktop scale (scale with `rem`) |
| Ghost buttons (if any in header) | 1px `#444` border, rounded, transparent fill |
| Add tile | 1px dashed `#555`, `+` at ~24px, muted |

## Tech Stack (slice 1b)

Unchanged from slice 1. Add **CSS** only (no new runtime dependencies).

## Commands

Same as slice 1:

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

Manual check: run desktop and Simulator; confirm dark shelf matches acceptance criteria.

## Project Structure (slice 1b additions)

```
packages/ui/
  src/styles/shelf.css          → tokens + layout (imported once from shell-entry)
  src/shelf/
    render-shelf.ts             → shelf chrome, row, cards, add tile, delete icon
    cover-palette.ts            → id → cover class or CSS variable (presentation only)
    strings.ts                  → optional new keys (shelf label, add tile label)
  src/mount.ts                  → mount shelf only; remove standalone h1
  src/shelf.test.ts             → update queries/roles for new DOM
```

## Code Style (slice 1b)

- **BEM-like** class prefix `shelf-` (keep existing error/empty class names or migrate in one commit).
- **Cover color:** pure function, no I/O:

```ts
// packages/ui/src/shelf/cover-palette.ts
const COVER_CLASSES = ["shelf-cover--a", "shelf-cover--b", /* … */] as const;

export function coverClassForBookId(id: string): (typeof COVER_CLASSES)[number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % COVER_CLASSES.length;
  return COVER_CLASSES[h];
}
```

- **Icons:** inline SVG in TS or small static SVG strings—no icon font package.
- **Semantic structure:** `<header class="shelf-header">`, `<section class="shelf-row">`, `<ul role="list">` / `<li role="listitem">` for cards.

## Testing Strategy (slice 1b)

| Level | What | Tool |
|--------|------|------|
| Unit | `coverClassForBookId` stable for same id | Vitest in `packages/ui` |
| Unit | Shelf mount: add tile calls `createBook`; N cards + 1 add tile; delete still confirms | Vitest + jsdom, mocked bridge |
| Manual | Visual parity pass against reference screenshot on desktop; smoke on iOS Simulator | Install doc checklist (append short “Shelf visual” bullets) |

No visual snapshot framework in slice 1b unless the human requests it (ask first).

## Boundaries (slice 1b)

- **Always:** Keep business rules in `services/library/`; cover colors and layout only in `packages/ui`. Run `bun run test` and `bun run lint` before sign-off.
- **Ask first:** New npm dependencies (fonts, icon packs, Tailwind), custom delete modal, author/cover fields on `book.json`, multi-shelf data model, Import button, user display name.
- **Never:** Copy proprietary Neo assets (logos, cover art, fonts) from the reference app; compute titles or sort keys in UI; make cards navigate without slice 2 spec.

## Success Criteria (slice 1b)

- Desktop and Simulator show the dark shelf UI; create/delete/persistence behave as slice 1.
- Horizontal row + add tile + cover-style cards meet acceptance criteria above.
- UI unit tests updated and green; install doc mentions a quick visual check.
- `tasks/plan.md` / `tasks/todo.md` replaced or extended via `/plan` after this slice is **approved** (archive slice 1 pair to `tasks/archive/library/` first per `janus-planning.mdc` if starting a new plan).

## Open Questions

1. **Empty shelf copy:** Hide “No books yet” visually and rely on the add tile only, or show muted helper text under **BOOKS**?
2. **Header actions:** Add-tile only, or also keep a small **New book** ghost button in the header for accessibility?
3. **Typography:** System serif for wordmark only, or add one licensed/open font file to `packages/ui` (would be “ask first”)?
4. **Card hover:** Subtle lift only, or also show delete icon only on hover (reference shows icons on hover)?

---

**Slice 1b next step:** **`/build`** from `tasks/todo.md` (plan in `tasks/plan.md`). Archive slice 1b pair to `tasks/archive/library-slice-1b/` when complete (or extend archive naming in `tasks/archive/README.md`).

---

# Slice 1c — Book naming (create dialog + rename)

> **Scope:** Writers choose and change book **titles** on the shelf. **Create** opens a modal to enter the name before the book is written to disk. **Rename** updates `book.json` for an existing book. Depends on slice 1 (CRUD + persistence) and slice 1b (dark shelf + add tile); does not enable open-book / manuscript.

## Assumptions (slice 1c)

```
ASSUMPTIONS I'M MAKING:
1. **Create:** Tapping the **+** add tile (and any header “New book” control, if present) opens a **modal dialog** first; the book is created only after the writer confirms with a non-empty title (see validation).
2. **Default title in the create dialog** is the next auto name from domain (`Untitled`, then `Untitled 2`, …) via `suggestNewBookTitle()` — the UI does not run `allocateUntitledTitle` locally. Pressing **Create** without editing the field uses that default (same outcome as slice 1 auto-create when the library is empty or only lower `Untitled N` slots are free).
3. **Rename:** A small **edit icon** on each card (same visibility pattern as delete: focus + hover-capable pointers) opens the rename dialog pre-filled with the current title; the cover **title stays plain text** (not a separate rename button).
4. **Duplicate titles** are **not allowed** after normalization (exact string match on shelf titles). `createBook` and `renameBook` reject with `DUPLICATE_BOOK_TITLE`; the name dialog shows inline feedback. `suggestNewBookTitle()` still uses `allocateUntitledTitle` for unused `Untitled` / `Untitled N` slots.
5. **Title rules** (trim, length, empty) live in `services/library/`; shells persist the validated title in `book.json` only.
6. **Cancel** on the dialog (Escape, Cancel button, backdrop click) does not create or rename; create leaves the shelf unchanged.
7. Dialog is a **custom accessible modal** in `packages/ui` (not `window.prompt`); styling matches slice 1b dark shelf (tokens in `shelf.css`).
8. English literals for dialog copy until `languages`; catalog keys listed below.
→ Correct me now or approve slice 1c and we proceed to `/plan`.
```

## Objective (slice 1c)

Writers name books explicitly when adding them and can fix titles on the shelf without re-creating a book. One-click create with silent `Untitled` allocation (slice 1 assumption 4) is **replaced** by this slice for the shelf UI; domain keeps `allocateUntitledTitle` for the create-dialog default only.

### User stories

- As a writer, when I add a book, I enter its name in a dialog before it appears on the shelf.
- As a writer, I can change a book’s name from the shelf and see the new title on the card after I save.
- As a writer, if I cancel naming, nothing new is created and existing titles stay unchanged.

### Acceptance criteria (slice 1c)

**Create flow**

- **+** add tile opens a modal with a single-line **Book name** field, **Create** (primary) and **Cancel**.
- Field is focused on open; default value is `suggestNewBookTitle()` from the bridge (`Untitled` / `Untitled 2`, …).
- **Create** calls `createBook(title)` with the field value after domain normalization; confirming with the **unchanged default** creates a book with that `Untitled` name (intended).
- On success the modal closes and the shelf re-renders with the new card.
- **Cancel** / Escape / backdrop closes without calling `createBook`.
- Empty or whitespace-only title: **Create** stays disabled or shows inline validation; no disk write.

**Rename flow**

- Each card has an **icon-only edit** control (inline SVG, no icon font) with an accessible name such as “Rename {title}”.
- Edit opens the same modal with heading **Rename book**, field pre-filled with current title, **Save** and **Cancel**.
- Title on the cover remains a non-interactive heading (`<h2>`); rename is only via the edit icon.
- **Save** calls `renameBook(id, title)`; on success modal closes and card title updates after re-render.
- **Cancel** leaves `book.json` unchanged.

**Domain and bridge**

- `normalizeBookTitle(raw: string): string` trims leading/trailing whitespace; throws `INVALID_BOOK_TITLE` if result is empty or exceeds max length (default **200** characters).
- `createBook(title: string)` validates title, writes manifest, returns `BookSummary` (replaces zero-arg `createBook()` on the bridge).
- `renameBook(id: string, title: string)` validates id and title, rewrites `book.json` with same `id`, `createdAt`, `version`; returns updated `BookSummary`.
- `suggestNewBookTitle(): Promise<string>` lists books (or reads titles only) and returns `allocateUntitledTitle(existingTitles)` — implemented in shell via domain, not in UI.
- Stable error codes: `INVALID_BOOK_TITLE`, `DUPLICATE_BOOK_TITLE`, `BOOK_NOT_FOUND`, `INVALID_BOOK_ID` (existing).

**Accessibility**

- Modal uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the dialog title.
- Focus moves into the field on open; Tab cycles within dialog; Escape closes (cancel).
- **Enter** in the book name field submits (same as **Create** / **Save** when the title is valid).
- On close, focus returns to the element that opened the dialog (+ tile or edit icon).

**Non-regression**

- Delete flow unchanged (`window.confirm` until a later slice).
- Sort order unchanged (`createdAt`, then `id`).
- Open book still disabled.
- Slice 1b visual layout (horizontal row, cover cards, add tile) unchanged except an edit icon on each card and modal overlay on the shelf.

### UI strings (English until `languages`)

| Key (future catalog) | Slice 1c English |
|----------------------|------------------|
| `library.dialog.createTitle` | New book |
| `library.dialog.renameTitle` | Rename book |
| `library.dialog.nameLabel` | Book name |
| `library.dialog.create` | Create |
| `library.dialog.save` | Save |
| `library.dialog.cancel` | Cancel |
| `library.dialog.invalidTitle` | Enter a book name. |
| `library.rename` | Rename |
| `library.renameFailed` | Could not rename the book. |

## Tech Stack (slice 1c)

Unchanged from slice 1. No new npm dependencies.

## Commands

Same as slice 1:

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

## Project Structure (slice 1c additions)

```
services/library/
  book-title.ts           → normalizeBookTitle, MAX_BOOK_TITLE_LENGTH
  index.ts                → export title helpers; create/rename service API
  shelf-service.ts        → createBook(title), renameBook(id, title)
  library.test.ts         → title validation, rename updates manifest

packages/bridge/
  src/index.ts            → JanusBridge: suggestNewBookTitle, createBook(title), renameBook

packages/ui/
  src/shelf/
    book-name-dialog.ts   → open/close modal, return confirmed title or null
    render-shelf.ts       → wire + tile and card edit icon to dialog
  src/styles/shelf.css    → modal overlay + form (dark theme)
  src/shelf.test.ts       → dialog create/rename flows with mocked bridge

apps/desktop/ + apps/mobile/
  IPC / native bridge     → new methods delegate to ShelfService
```

## Code Style (slice 1c)

Domain owns normalization and errors; UI only displays messages and passes strings to the bridge.

```ts
// services/library/book-title.ts
export const MAX_BOOK_TITLE_LENGTH = 200;

export class InvalidBookTitleError extends Error {
    readonly code = "INVALID_BOOK_TITLE";
}

export function normalizeBookTitle(raw: string): string {
    const title = raw.trim();
    if (title.length === 0) {
        throw new InvalidBookTitleError("Book title is required");
    }
    if (title.length > MAX_BOOK_TITLE_LENGTH) {
        throw new InvalidBookTitleError("Book title is too long");
    }
    return title;
}
```

Dialog API (presentation):

```ts
// packages/ui/src/shelf/book-name-dialog.ts
export type BookNameDialogMode = "create" | "rename";

export function openBookNameDialog(options: {
    mode: BookNameDialogMode;
    initialValue: string;
    onConfirm: (title: string) => void | Promise<void>;
}): void;
```

## Contract changes (slice 1c)

| Method | Behavior |
|--------|----------|
| `suggestNewBookTitle()` | `Promise<string>` — next default `Untitled` / `Untitled N` from current library titles. |
| `createBook(title: string)` | Validates title, creates book dir + `book.json`, returns `BookSummary`. Replaces `createBook()` with no args. |
| `renameBook(id: string, title: string)` | Validates id and title, updates `book.json` title field, returns `BookSummary`. |

## Testing Strategy (slice 1c)

| Level | What | Tool |
|--------|------|------|
| Unit | `normalizeBookTitle` (trim, empty, max length) | Vitest in `services/library/` |
| Unit | `renameBook` writes manifest; `BOOK_NOT_FOUND` | Vitest with mock `ShelfFs` |
| Unit | Create dialog: confirm calls `createBook` with entered title; cancel does not | Vitest + jsdom |
| Unit | Rename: edit icon opens dialog; save calls `renameBook` | Vitest + jsdom |
| Integration | Desktop IPC: create with custom title; rename round-trip | Existing library IPC tests |

## Boundaries (slice 1c)

- **Always:** Title validation and manifest updates only in `services/library/`. Run `bun run test` and `bun run lint` before sign-off.
- **Ask first:** Unique-title enforcement across the library, subtitle/author fields, inline edit without modal, schema version bump, new UI framework.
- **Never:** `window.prompt` for naming; compute `Untitled N` in `packages/ui`; allow rename without updating `book.json` on disk.

## Success Criteria (slice 1c)

- Create and rename flows work on desktop and mobile shell with the slice 1b shelf visible.
- Titles persist across app restart.
- Bridge and domain tests green; shelf UI tests cover dialog confirm/cancel.
- Slice 1 assumption 4 and decision 2 (one-click silent create) are superseded for product behavior; `allocateUntitledTitle` remains for dialog defaults only.

## Decisions (slice 1c)

1. **Rename affordance:** **Edit icon** on each card (not a clickable title).
2. **Create default:** Dialog opens with **`Untitled` / `Untitled N`** from `suggestNewBookTitle()`; **Create** without edits uses that name.

## Open Questions (resolved for build)

| Question | Decision (see `tasks/plan.md`) |
|----------|----------------------------------|
| Backdrop click | Cancel — no create/rename |
| API errors | Inline in book-name modal (duplicate, invalid title, create/rename failure); `.shelf-error` only for shelf load/delete outside dialog |

---

**Slice 1c next step:** **`/build`** from `tasks/todo.md` (plan in `tasks/plan.md`). Archive pair to `tasks/archive/library-slice-1c/` when complete.
