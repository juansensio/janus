# Implementation Plan: library on-disk (root relocate + title folders)

**Source specs:**

- `docs/specs/SPEC-library-root.md` — **Slice 2** (relocate on Settings change; fix Settings in dev)
- `docs/specs/SPEC-library.md` — **Slice 1e** (title-based book folders)

**Archived:** `tasks/archive/library-root-slice-1/`

## Overview

Two related improvements to how books live on disk:

1. **Library root (slice 2)** — Today **Settings hides “Choose folder…”** when the active root is `dev-default` (`JANUS_DEV=1` → `.janus-library`) or `env`, which blocks changing location during `dev:desktop`. After a pick, slice 1 only updates `janus-settings.json` and reloads; **books stay at the old path**, so the shelf looks empty. Slice 2 **moves the entire library tree** (`books/`, manifests, manuscripts) to the chosen folder before persisting settings, and adjusts resolution so an explicit settings path **wins over dev default** (still below `JANUS_LIBRARY_ROOT`).

2. **Book folders (slice 1e)** — Under any library root, replace `books/<uuid>/` with **title-based directory names**; UUID remains in `book.json` and on the bridge; rename on shelf renames the folder; migrate existing UUID dirs on list.

**Build order:** Slice 2 first (unblocks Settings + data follows the user), then slice 1e.

## Architecture decisions (slice 2)

- **Why Settings looks broken:** `render-settings.ts` sets `canChoose` false for `dev-default` and `env`. Most local work uses `dev:desktop` → no button. Fix: show **Choose folder…** on desktop whenever `source !== "env"`; show helper text for dev-default explaining saved path applies after reload.
- **Resolution order (desktop)** — update to:
  1. `JANUS_LIBRARY_ROOT` (absolute)
  2. **`settings.libraryRoot`** if set (user explicitly chose a folder — applies in dev and prod)
  3. `JANUS_DEV=1` → `<repo>/.janus-library`
  4. `userData/library`
- **Relocate on choose:** `moveLibraryRoot(fromRoot, toRoot, fs)` in `apps/desktop` (shell owns FS move; not `services/library` rules). Move **contents** of active library (`books/` and any siblings) into target; if target already has a non-empty `books/`, reject with `LIBRARY_ROOT_NOT_EMPTY` (new code) unless merge policy added later. Use copy+delete or rename via temp — prefer **rename whole root** when `fromRoot` can be renamed into parent of `toRoot`, else **cp -r** `books` then remove source `books` after success.
- **Same path / noop:** Choosing current path → cancel or no-op without error.
- **Reload:** unchanged after successful move + save.

## Architecture decisions (slice 1e)

(Unchanged from prior plan — see tasks 4–7 in `tasks/todo.md`.)

## Dependency graph

```
Tasks 1–3: library-root slice 2 (precedence, relocate, UI, docs)
    → Tasks 4–7: library slice 1e (dirname, shelf, manuscript, docs)
```

```
Task 1: resolveLibraryRoot precedence + tests
    → Task 2: moveLibraryRoot + chooseLibraryRoot integration
        → Task 3: Settings UI + slice 2 spec/docs
            → Task 4: bookDirectoryName + resolveBookDirById
                → Task 5: shelf-service + uuid dir migration
                    → Task 6: manuscript adapters
                        → Task 7: SPEC 1e + install notes
```

## Task list

Full acceptance criteria: **`tasks/todo.md`** Tasks **1–7**.

### Phase A: Library root slice 2
- [x] Task 1: Settings wins over dev-default in resolver
- [x] Task 2: Move library contents on choose
- [x] Task 3: Settings UI + SPEC-library-root slice 2

### Checkpoint: Settings relocate
- [ ] Choose folder visible in dev; after pick + reload, books appear at new path with files moved

### Phase B: Title folders (1e)
- [x] Tasks 4–7 per todo

### Checkpoint: Complete
- [ ] `bun run test` && `bun run lint`
- [ ] Manual: Settings move + titled folders under `.janus-library` or custom root

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Partial move leaves two copies | High | Move `books/` only in one transaction; fail closed; tests with temp dirs |
| Dev user expects `.janus-library` forever | Med | Copy in Settings UI; settings override documented |
| Title folder rename + root move interaction | Low | Build root slice 2 first; 1e migration runs on any root |

## Human approval

Review **`tasks/todo.md`**. Approve **SPEC-library-root slice 2** (relocate + precedence) and **SPEC-library slice 1e** before **`/build`** Task 1.
