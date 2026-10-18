# Implementation Plan: library on-disk (root relocate + title folders)

**Closed:** 2026-10-18 — implementation complete; manual verification checkpoints waived per human sign-off before languages `/plan`.

**Source specs:**

- `docs/specs/SPEC-library-root.md` — **Slice 2** (relocate on Settings change; fix Settings in dev)
- `docs/specs/SPEC-library.md` — **Slice 1e** (title-based book folders)

**Archived:** `tasks/archive/library-root-slice-1/`

## Overview

Two related improvements to how books live on disk:

1. **Library root (slice 2)** — Settings **Choose folder…** in dev; **move library contents** on pick; saved `libraryRoot` **wins over** dev default (below `JANUS_LIBRARY_ROOT`).

2. **Book folders (slice 1e)** — `books/<Title>/` with uuid in `book.json`; rename migrates folder; UUID dirs migrate on list.

**Build order:** Slice 2 first, then slice 1e.

## Task list (completed)

Full detail: **`todo.md`** in this folder. Tasks 1–7 implemented; automated tests green.

### Phase A: Library root slice 2
- [x] Task 1: Settings wins over dev-default in resolver
- [x] Task 2: Move library contents on choose
- [x] Task 3: Settings UI + SPEC-library-root slice 2

### Phase B: Title folders (1e)
- [x] Tasks 4–7

### Checkpoints (manual — waived)
- Settings relocate and title-folder Finder checks deferred; automated coverage in Vitest.
