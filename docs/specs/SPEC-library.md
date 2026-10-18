# Spec: library

> Status: **not approved**. Depends on implemented **shell** (`docs/specs/SPEC-shell.md`). **Slice 1** (this spec) intentionally ships **before** `languages` and `manuscript` per product direction; full “open and write” waits on `manuscript`.

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
| **Slice 1 — Shelf CRUD** (this spec) | List, create, delete books; minimal `book.json`; simple card UI | `shell` |
| **Slice 2 — Open book** | Selecting a card opens the manuscript for that book | `manuscript` |
| **Slice 3 — Arrange** | Reorder or group books on the shelf | Slice 2 + product rules |

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
- `CAPABILITY-MAP.md` footnote documents slice 1 vs full library (after approval).

## Open Questions

1. **Library root:** Is app user-data (`userData` / Capacitor data directory) acceptable, or do you want an explicit “Choose library folder” in slice 1?
2. **Create flow:** Is one-click **New book** with auto `Untitled` titles correct, or should slice 1 prompt for a title?
3. **Delete:** Is `window.confirm` acceptable for slice 1, or do you want a custom in-app dialog now?
4. **Corrupt books:** If `book.json` is invalid, should the shelf hide that folder, show an error card, or block startup?
5. **Capability map:** Approve adding a footnote that **library slice 1** (shelf CRUD only) may ship after **shell**, before **languages** / **manuscript**?

---

**Next step after approval:** **Plan** (`tasks/plan.md`) — slice 1 tasks: domain + bridge + desktop FS + mobile FS + shelf UI + install-doc checks. Do not implement until this spec is approved.
