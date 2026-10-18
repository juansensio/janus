# Spec: manuscript

> Status: **not approved**. **Slice 1 — open, write, autosave.** Depends on signed-off **shell** and implemented **library** slice 1c (shelf CRUD, naming, dark shelf). Does **not** wait on `languages`.

This is one module from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). It is not a new map. Library slice 2 in [`SPEC-library.md`](SPEC-library.md) (“selecting a card opens the manuscript”) is delivered here. Library still owns which books exist and what `book.json` says. Manuscript owns the writing file and the editor.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Slice 1 is one plain writing surface. The characters in the field are the file. No preview, toolbar, chapters, or section breaks.
2. Each book has at most one UTF-8 file, `manuscript.md`, beside `book.json`. A missing file means an empty book.
3. Autosave waits 400ms after the last change, and also runs immediately when leaving the editor. There is no Save button.
4. Leaving uses a **Shelf** control. Edit and delete stay on the shelf; those controls do not open the editor.
5. The book title is shown read-only in the editor. Rename stays the shelf dialog.
6. Desktop and mobile both get the same screen. UI copy is English literals until `languages`.
7. `services/manuscript/` does not import `services/library/`. The shell checks that the book exists, then asks manuscript to read or write `manuscript.md`.
→ Correct me now or approve and we proceed with these.
```

## Objective

The writer clicks a book on the shelf and lands in an editor for that book. They type. The text is saved to a markdown file without a Save button. They return to the shelf, open the same book, and the text is still there.

The user is one writer on one machine. No accounts, no network.

### Phased delivery (this module)

| Phase | Outcome | Depends on |
|--------|---------|------------|
| **Slice 1 — Open and autosave** (this spec) | Click a book, edit one `manuscript.md`, return to the shelf, open it again | `shell`, library slice 1c |
| **Later** | Chapters, section breaks, book language | `languages` where the map says so |

### User stories

- As a writer, I click a book on the shelf and the editor opens for that book.
- As a writer, I type and the text is stored in that book’s markdown file without me pressing Save.
- As a writer, I go back to the shelf, open the same book, and I see what I wrote.
- As a writer, I can still rename or delete a book from the shelf; those actions do not open the editor.

### Acceptance criteria (slice 1)

- Clicking a book card opens the editor. The shelf’s edit and delete controls do not.
- A book with no `manuscript.md` opens as an empty field and does not create the file until the first save.
- After the writer changes the text, the file on disk matches the field within one debounce (400ms) once the write finishes.
- Activating **Shelf** writes any pending text first, then shows the shelf. If that write fails, the editor stays open and shows an error; the typed text remains in the field.
- Opening the same book again shows the saved text, including blank lines and characters outside ASCII.
- Quit and relaunch, then open the book: the same text is there.
- Rename and delete on the shelf behave as they do today. Delete removes the book directory, including `manuscript.md`.
- File rules live in `services/manuscript/`. The UI displays the title, the text, and save status; it does not choose paths or filenames.
- `packages/ui` does not import `services/*`.

## Tech Stack

- **TypeScript** (strict), **Bun** workspaces, **Vite** UI bundle per `SPEC-shell.md`.
- Domain: `services/manuscript/` (`@janus/manuscript`), pure TS, no Electron, Capacitor, or DOM.
- Bridge: extend `@janus/bridge` `JanusBridge` with read and write methods.
- UI: vanilla TS in `packages/ui` (no editor framework).
- Tests: **Vitest** and happy-dom, same as the shelf.

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

## Project Structure

```
services/manuscript/
  index.ts                 → public API
  manuscript-service.ts    → read and write manuscript.md
  manuscript.test.ts       → unit tests
  package.json             → @janus/manuscript

packages/bridge/
  src/index.ts             → readManuscript, writeManuscript on JanusBridge

packages/ui/
  src/mount.ts             → shelf or editor, one at a time
  src/editor/              → editor DOM (names at implement time)

apps/desktop/
  src/                     → IPC + preload for the two methods

apps/mobile/
  src/native-bridge.ts     → same two methods via Capacitor FS

docs/specs/SPEC-manuscript.md
```

`book.json` stays owned by `services/library/`. This slice does not add fields to it.

## On-disk format (slice 1)

```
<libraryRoot>/
  books/
    <bookId>/
      book.json
      manuscript.md
```

- `manuscript.md` is UTF-8 text. The bytes are what the writer sees, with no front matter and no title line added by the app.
- Absent file: read returns `""`.
- First successful save creates the file. Opening and leaving without a change does not create it.
- A save of empty text after the file exists writes an empty file.
- Writes replace the file by writing a temporary file in the same directory and renaming it over `manuscript.md`, so a crash mid-write does not leave a truncated manuscript. The temporary name is an implementation detail and must not remain after a successful write.
- Newlines and Unicode are stored as typed. This slice does not normalize line endings.

## Code Style

Match `SPEC-shell.md`, `SPEC-library.md`, and `AGENTS.md`. Domain functions take a book directory and a filesystem port and return plain values. Errors carry a stable `code`.

```ts
export const MANUSCRIPT_FILENAME = "manuscript.md";

export type ManuscriptFs = {
  readFile(path: string, encoding: "utf8"): Promise<string>;
  writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  join(...parts: string[]): string;
};

export function createManuscriptService(fs: ManuscriptFs) {
  return {
    read(bookDir: string): Promise<string> {
      /* missing file → "" */
    },
    write(bookDir: string, text: string): Promise<void> {
      /* replace manuscript.md atomically */
    },
  };
}
```

The shell resolves `<libraryRoot>/books/<id>` with the library path helpers, rejects a bad id with `INVALID_BOOK_ID`, and rejects a missing book with `BOOK_NOT_FOUND` before calling manuscript. Manuscript does not parse `book.json` and does not allocate titles.

## Contract

### Bridge

| Method | Behavior |
|--------|----------|
| `readManuscript(id: string)` | Returns the manuscript string. Missing file returns `""`. |
| `writeManuscript(id: string, text: string)` | Replaces `manuscript.md` with `text`. Returns nothing. |

Both reject with `Error` objects carrying `code`: existing `INVALID_BOOK_ID` and `BOOK_NOT_FOUND`, plus `MANUSCRIPT_READ_FAILED` or `MANUSCRIPT_WRITE_FAILED` when the filesystem fails for another reason. Callers branch on `code`, not on message text.

`createMockJanusBridge` implements both. The mock starts empty and keeps text in memory per id.

### UI

The shell shows either the shelf or the editor, not both.

**Open.** The card is activatable (click, and keyboard on a control labeled with the book title). Edit and delete keep their own buttons and do not open the editor.

**Editor.** Replaces the shelf. Shows:

- **Shelf** — returns to the shelf after a successful flush of pending text.
- The book title, not editable.
- A status the writer can see: saving while a write is in flight, saved after it succeeds, and a short error if it fails.
- One text field. Its value is the file. Focus moves there when the editor opens, with the cursor at the end.

**Autosave.** 400ms after the last change, call `writeManuscript` with the current value. If the writer types again during a write, the write that lands last must be the latest value, not an older one. Do not write when the value matches the last successful save. **Shelf** cancels the wait and writes immediately when the field differs from that save.

**Load failure.** Show the error and **Shelf**. **Shelf** does not need to write.

**Strings** (English until `languages`):

| Key (future catalog) | Slice 1 English |
|----------------------|-----------------|
| `manuscript.backToShelf` | Shelf |
| `manuscript.saving` | Saving… |
| `manuscript.saved` | Saved |
| `manuscript.saveFailed` | Could not save this book. |
| `manuscript.loadFailed` | Could not open this book. |
| `manuscript.openBook` | Open {title} |

Visual: same dark chrome as the shelf. No new font and no markdown library.

## Testing Strategy

- **Domain** (`services/manuscript/manuscript.test.ts`): missing file reads as `""`; write then read round-trip; Unicode and blank lines preserved; second write replaces the first; successful write leaves no temp file; `book.json` is not required and is not modified.
- **Bridge:** mock read/write round-trip.
- **UI** (happy-dom): card opens the editor with loaded text; edit and delete do not; a change calls `writeManuscript` after the debounce; **Shelf** flushes then shows the shelf; a failed flush stays on the editor with the error and the typed text; open again shows the saved text.
- **Desktop:** IPC tests for read, write, `BOOK_NOT_FOUND`, and `INVALID_BOOK_ID`, following the library IPC tests.
- **Mobile:** native bridge forwards the same two methods.

`bun run test` and `bun run lint` pass before the slice is done. Desktop check: create or pick a book, type, return to the shelf, open it again, quit, relaunch, open it again.

## Boundaries

- **Always:** Keep manuscript path and filename rules in `services/manuscript/`. Keep shelf identity rules in `services/library/`. Run `bun run test` before treating the slice complete. Preserve text exactly. Flush before leaving the editor. Both shells.
- **Ask first:** A rich-text or markdown editor dependency (CodeMirror, ProseMirror, and similar). Chapters, section breaks, preview, or a formatting toolbar. A `language` field or any other change to `book.json`. A manuscript size limit. Changing the 400ms wait.
- **Never:** Store the manuscript inside `book.json`. Import `services/*` from `packages/ui`. Create `manuscript.md` from library create/rename. Open the editor from the edit or delete controls. Add AI actions in this slice.

## Success Criteria

- From the shelf, one book opens into an editor, typed text lands in `books/<id>/manuscript.md`, **Shelf** returns to the same shelf, and opening that book shows the saved text after a restart.
- Edit, rename, and delete on the shelf still work.
- `bun run test` and `bun run lint` pass.

## Open Questions

None beyond the assumptions above. Approval means those seven assumptions stand.

On approval, add a footnote to `CAPABILITY-MAP.md`: manuscript slice 1 builds after library slice 1c and does not wait on `languages`. Chapters and section breaks stay out of this slice.

**Next step after approval:** `/plan` for this spec only. Archive the current library plan pair first if it is still the active plan (`janus-planning.mdc`).
