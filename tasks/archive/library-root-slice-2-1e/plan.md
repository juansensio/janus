# Implementation Plan: library on-disk (root relocate + title folders)

**Closed:** 2026-10-18 — implementation complete. Manual verification pass recorded below before languages `/plan`.

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

Full detail: **`todo.md`** in this folder. Tasks 1–7 implemented; `bun run test` green (187 tests as of close-out).

### Phase A: Library root slice 2
- [x] Task 1: Settings wins over dev-default in resolver
- [x] Task 2: Move library contents on choose
- [x] Task 3: Settings UI + SPEC-library-root slice 2

### Phase B: Title folders (1e)
- [x] Tasks 4–7

## Close-out verification (2026-10-18)

Automated: `bun run test` **187 passed**. Lint not re-run in this pass.

On-disk (dev library `.janus-library/`):

- Title folders: **confirmed** — `books/asd/book.json` + `manuscript.md` (folder name is the book title, not the uuid).
- Settings relocate: **implemented in code** (`canChoose` when `source !== "env"`; `moveLibraryContents` then persist). Not exercised in the Electron UI this pass (Computer Use needs Accessibility + Screen Recording).
- Shelf wrap: **not signed off**. CSS has `flex-wrap: wrap` on `.shelf-track`, but flex sizing lives on inner `.shelf-card` / `.shelf-add` while flex items are `li`. User still reports horizontal overflow. Slice 1d was never written into `SPEC-library.md`. **Carried into the languages plan as leftover Task 8.**

Manuscript slice 1 remains archived at `tasks/archive/manuscript-slice-1/` (already closed).
