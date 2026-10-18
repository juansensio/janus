# Implementation Plan: library (slice 1)

**Source spec:** `docs/specs/SPEC-library.md` (approved 2026-10-18)  
**Archived:** `tasks/archive/shell/` (shell module complete)

## Overview

Bookshelf **list / create / delete** with on-disk `book.json` under `<libraryRoot>/books/<bookId>/`. Domain rules live in **`services/library/`** (`@janus/library`). Desktop and mobile shells perform filesystem I/O only through **extended `JanusBridge`** methods; **`packages/ui`** renders the shelf and forwards actions (no title allocation, sort, or manifest parsing in UI).

**Prerequisite:** Shell signed off (`tasks/archive/shell/`).

**Not in slice 1:** Open book → `manuscript`, rename UI, `languages` catalog, custom delete modal (use `window.confirm`).

## Architecture decisions

- **Workspace:** Add `services/*` to root Bun workspaces; package name **`@janus/library`**.
- **Bridge contract:** `BookSummary` and async `listBooks()`, `createBook()`, `deleteBook(id)` on `JanusBridge`; reject with `Error` carrying string **`code`** (e.g. `BOOK_NOT_FOUND`).
- **Desktop I/O:** No `fs` in preload. **`ipcMain.handle`** in main uses Node `fs`; preload exposes `ipcRenderer.invoke`. Library root: `path.join(app.getPath("userData"), "library")`.
- **Mobile I/O:** Capacitor **`@capacitor/filesystem`** in `apps/mobile` only; same domain helpers for manifest bytes and paths.
- **Corrupt entries:** Shells skip invalid dirs when listing; policy unit-tested in domain.
- **UI:** Shelf in `packages/ui`; English literals per spec; delete via **`window.confirm`**.
- **Validation:** `validate:install` stays shell-focused; library manual checks in **`docs/install-macos.md`**.

## Dependency graph

```
Task 1 @janus/library domain + unit tests
    → Task 2 JanusBridge + BookSummary (+ fix test mocks)
        ├→ Task 3 Desktop IPC + FS adapter
        └→ Task 4 Mobile Capacitor FS adapter
Task 2 + 3 + 4
    → Task 5 Shelf UI + mount wiring
        → Task 6 Install doc library section
Task 3
    → Task 7 (optional) Desktop integration test
Task 6 + 7
    → Task 8 Human sign-off
```

## Task list

Full acceptance criteria: **`tasks/todo.md`** Tasks **1–8**.

### Phase 1: Foundation
- [ ] Task 1: `@janus/library` domain package
- [ ] Task 2: Extend `JanusBridge` contract

### Checkpoint: Foundation
- [ ] `bun run test` includes `services/library/`; bridge mocks updated

### Phase 2: Shell I/O
- [ ] Task 3: Desktop library IPC and FS
- [ ] Task 4: Mobile Capacitor FS adapter

### Checkpoint: Adapters
- [ ] Both shells expose `listBooks` / `createBook` / `deleteBook`

### Phase 3: Shelf
- [ ] Task 5: Bookshelf UI and mount wiring
- [ ] Task 6: Install doc — library manual checks

### Checkpoint: Shelf CRUD
- [ ] Desktop + Simulator create/delete; persistence across restart
- [ ] `bun run validate:install` still passes

### Phase 4: Sign-off
- [ ] Task 7 (optional): Desktop integration test
- [ ] Task 8: Human sign-off

### Checkpoint: Complete
- [ ] Install doc library section verified
- [ ] `bun run test` && `bun run lint` green

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| First desktop IPC; sandbox/preload mistakes | High | Thin handlers; colocated tests; no `fs` in preload |
| Capacitor FS paths differ from Electron | Med | Domain path helpers; Simulator manual gate (Task 8) |
| Shelf UI breaks shell validate label guard | Med | Keep `data-platform` on `#app`; extend guard only if needed |

## Open questions

- **Task 7:** Required for sign-off or optional (like shell desktop smoke)?
- **Capacitor:** Pin `@capacitor/filesystem` when Task 4 starts.

## Human approval

Review **Tasks 1–8** in `tasks/todo.md` before `/build` Task 1.
