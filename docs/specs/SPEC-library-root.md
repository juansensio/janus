# Spec: library-root

> Status: **Slice 1 approved** (2026-10-18). **Configurable library directory.** Depends on shipped **shell**, **library** slice 1+, and **manuscript** slice 1. Does **not** wait on `languages`.

This is a cross-cutting **shell + bridge** capability indexed from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). It is not a new domain module. **`services/library/`** keeps book rules and the `books/` layout; shells decide **which absolute path** is the library root and persist that choice. **`packages/ui`** shows the current location and triggers folder selection; it does not resolve or validate paths.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Slice 1 targets **desktop (Electron)** for production folder selection. **Mobile** keeps the existing Capacitor `Directory.Data` + relative `library/` tree; no system folder picker in this slice.
2. **Development** defaults to a **gitignored directory inside the repo** (`.janus-library/`) when `JANUS_DEV=1`, unless `JANUS_LIBRARY_ROOT` overrides it. Production desktop defaults to `app.getPath("userData")/library` when the user has not chosen a folder.
3. The user’s choice is stored in **app settings** under Electron `userData` (e.g. `janus-settings.json`), **not** inside the library folder. Settings hold an absolute path string only.
4. Changing the library root via **Settings** does not migrate books in slice 1. The app switches to the new root (creating `books/` if needed). Books at the old root remain on disk. **Exception (dev only):** on first use of the `.janus-library` dev default, if Electron `userData/library` exists and the dev folder does not, the shell **moves** that tree into `.janus-library` so existing local books follow the developer into the repo folder.
5. After the user picks a new folder, the app **reloads the window** (or restarts) so all IPC handlers bind to the new root. No hot-swap of in-memory services without reload.
6. Validation is shallow: path must be absolute, writable, and usable as a library root (`books/` may be created empty). The shell does not require existing books to switch roots.
7. English UI literals until `languages`. One **Settings** screen (or shelf entry point) on desktop only in slice 1.
→ Correct me now or approve and we proceed with these.
```

## Objective

The writer controls **where Janus stores books on disk**: fast iteration in development (repo-local, gitignored) and an explicit **folder choice in production** on desktop instead of a hidden Application Support path only.

Success: in dev, books appear under `.janus-library/books/…` in the clone; in production, the user opens Settings, sees the current folder, chooses another directory, and after reload the shelf reflects that location. Manuscript autosave continues to write `manuscript.md` under the active root.

### User stories

- As a developer, I run `bun run dev:desktop` and books are stored under a gitignored folder in the repo so I can inspect files quickly.
- As a developer, I can set `JANUS_LIBRARY_ROOT` to any absolute path for one-off testing.
- As a writer on desktop, I open Settings, see where my library lives, and choose a different folder for my books.
- As a writer, after choosing a folder and reloading, create/open/autosave behave exactly as today, relative to the new root.

### Acceptance criteria (slice 1)

**Resolution order (desktop)** — first match wins:

1. `process.env.JANUS_LIBRARY_ROOT` (absolute path; set by dev scripts or the user’s shell).
2. Else if `JANUS_DEV=1`: `<repoRoot>/.janus-library` (create if missing).
3. Else if settings file contains `libraryRoot`: that absolute path.
4. Else: `path.join(app.getPath("userData"), "library")` (today’s default).

**Development**

- `.janus-library/` is listed in `.gitignore`.
- `scripts/dev-desktop.ts` documents (or sets) `JANUS_DEV=1`; optional explicit `JANUS_LIBRARY_ROOT` in docs.
- Books created in dev land under `.janus-library/books/<id>/` unless overridden.

**Production desktop**

- Settings UI shows the **current library root** as a read-only path (basename + full path or truncated with `title` tooltip).
- **Choose folder…** opens the OS directory picker (`dialog.showOpenDialog` with `openDirectory`).
- On confirm: validate writable, persist to `janus-settings.json`, prompt reload (or reload automatically with short copy).
- Invalid or cancelled picker does not change the active root.

**Mobile**

- Unchanged: `library/` under Capacitor Data. Settings UI for library path is **out of scope** slice 1.

**Regression**

- Shelf CRUD, open editor, autosave, rename, delete unchanged relative to the **active** root.
- `bun run test` and `bun run lint` pass.

## Tech Stack

Same as existing Janus stack (`SPEC-shell.md`, `SPEC-library.md`):

- TypeScript, Bun, Electron main/preload, Vitest, happy-dom for UI tests.
- No new npm dependencies unless required for path validation (prefer Node `fs` in main).

## Commands

```
Install:     bun install
Dev desktop: bun run dev:desktop
             # optional: JANUS_LIBRARY_ROOT=/path/to/lib bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

## Project Structure

```
apps/desktop/src/
  library-root.ts          → resolveLibraryRoot(), load/save settings
  library-root.test.ts     → resolution order + settings merge
  main.ts                  → use resolveLibraryRoot() for IPC registration
  settings-ipc.ts          → getLibraryRoot, chooseLibraryRoot (new)
  preload.ts               → expose new bridge methods

packages/bridge/src/
  index.ts                 → JanusBridge + error codes + mock

packages/ui/src/
  settings/                → renderSettings (desktop entry from shelf)
  mount.ts or shelf        → link to settings (e.g. gear control)

.gitignore                 → .janus-library/

docs/specs/SPEC-library-root.md
docs/install-macos.md      → dev + settings verification steps
```

Optional small helper in `services/library/` (e.g. `ensureBooksDir(libraryRoot, fs)`) only if the same mkdir policy is needed in tests — **no** path persistence in domain.

## Code Style

Shell resolves paths; domain still receives `libraryRoot: string` into `createShelfService` / manuscript adapters.

```ts
export type JanusSettings = {
  libraryRoot?: string; // absolute; desktop production only
};

export function resolveLibraryRoot(options: {
  env: NodeJS.ProcessEnv;
  repoRoot: string;
  userDataPath: string;
  settings: JanusSettings;
  isDev: boolean;
}): string {
  // env → dev default → settings → userData/library
}
```

Reject invalid paths with `LibraryBridgeError` / stable code `INVALID_LIBRARY_ROOT` (new bridge code). UI maps codes to English strings; no path logic in `packages/ui`.

## Contract

### Bridge (desktop slice 1)

| Method | Behavior |
|--------|----------|
| `getLibraryRoot()` | Returns `{ path: string; source: "env" \| "dev-default" \| "settings" \| "user-data" }` for display. Path is absolute. |
| `chooseLibraryRoot()` | Opens directory picker; on success validates, saves settings, returns `{ path, needsReload: true }`. On cancel, rejects with `LIBRARY_ROOT_CANCELLED` or resolves without change (pick one at implement time and document). |

Mobile mock: `getLibraryRoot()` returns a fixed logical description; `chooseLibraryRoot()` rejects with `NOT_SUPPORTED` or is omitted from mobile bridge type (prefer explicit reject for shared UI compile).

### Settings UI

- Entry from shelf (control labeled **Settings**).
- Shows current path from `getLibraryRoot()`.
- Primary action **Choose folder…** calls `chooseLibraryRoot()`; on success show “Restart to use this library” (or auto `location.reload()` after save).
- **Back** returns to shelf without side effects.

### On-disk layout (unchanged)

```
<libraryRoot>/
  books/
    <bookId>/
      book.json
      manuscript.md
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `resolveLibraryRoot` precedence | Vitest, pure function |
| Unit | Settings load/save round-trip | Temp `userData` dir |
| Desktop IPC | `getLibraryRoot` / `chooseLibraryRoot` | Mock `dialog`, temp fs |
| Bridge | Mock implements new methods | `createMockJanusBridge` |
| UI | Settings renders path; choose triggers bridge | happy-dom, mocked bridge |

Manual (add to `docs/install-macos.md`):

1. Dev: create book, confirm files under `.janus-library/books/`.
2. Prod-like: `desktop:prod`, choose a folder on Desktop, reload, create book, confirm files there.
3. Override: `JANUS_LIBRARY_ROOT=… bun run dev:desktop` uses that path.

## Boundaries

- **Always:** Single resolution function used by library and manuscript IPC registration. Persist settings outside the library tree. Gitignore dev default. Run `bun run test` before slice complete.
- **Ask first:** Migrating/copying books between roots; iCloud/sync folders; symlinks; network drives; changing mobile library location; multiple libraries; cloud backup.
- **Never:** Store `libraryRoot` inside `book.json`. Import `services/*` from `packages/ui`. Hardcode repo paths in domain modules. Silently fall back to a different root on validation failure without user-visible error.

## Success Criteria

- Developers can find manuscript files under `.janus-library/` during `dev:desktop`.
- Desktop writers can point the app at a chosen folder and use shelf + editor against that location after reload.
- Mobile behavior unchanged.
- Tests and lint green.

## Open Questions

1. **Reload UX:** Automatic `reload()` vs modal “Quit and reopen” — default recommendation: **reload webcontents** after successful save (simplest).
2. **Cancel code:** `LIBRARY_ROOT_CANCELLED` vs resolve-with-no-op — recommend **reject with code** so UI does not flash errors.

On approval, add a footnote to `CAPABILITY-MAP.md` and run **`/plan`** for this spec only (fresh `tasks/plan.md` + `tasks/todo.md`).

**Supersedes:** `SPEC-library.md` decision item “Library root: App user-data for slice 1; no Choose folder UI yet” for **desktop production** only; mobile default unchanged.
