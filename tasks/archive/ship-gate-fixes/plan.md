# Implementation Plan: Ship-gate fixes (2026-10-18)

**Status:** Implemented 2026-10-18. See `tasks/todo.md` in this archive folder.

**Source:** `/ship` NO-GO on `main` (`564f837`) — blockers and recommended hardening from parallel code / security / test review.

**Specs touched (no new module spec):**

- `docs/specs/SPEC-library.md` — slice 1e (title folders; collision gap)
- `docs/specs/SPEC-languages.md` — slice 1 (persistence + DRY interpolation)
- `docs/specs/SPEC-library-root.md` — `janus-settings.json` shape

**Archived:** `tasks/archive/idle-post-perf/` (previous idle root plan).

## Overview

Close the **data-integrity blocker** where distinct shelf titles map to the same sanitized folder name (`createBook` / `renameBook`), add **targeted tests** called out by the test gate, **harden settings load** against corrupt JSON, and **deduplicate** placeholder interpolation per Invariant 11. Optional follow-up: manuscript path containment (symlinks) aligned with `deleteBook`.

## Architecture decisions

1. **One home for directory disambiguation** — Extract `uniqueDirectoryName` from `migrate-legacy-uuid-dirs.ts` into `services/library/` (e.g. `book-directory-name.ts` or `allocate-book-directory.ts`) and use it in **migrate**, **createBook**, and **renameBook**. Same suffix rule as migration (`"Title 2"`, `"Title 3"`, …).
2. **Title uniqueness stays canonical** — Shelf still dedupes by **exact title** (`assertTitleNotDuplicate`). Folder allocation only prevents **filesystem** clashes when sanitized names collide.
3. **Settings normalization at load** — Shared `normalizeJanusSettings(parsed): JanusSettings` in one place shells call after `JSON.parse` (desktop `library-root.ts`, mobile `janus-settings.ts`): string-only `libraryRoot` / `uiLocale`, drop invalid types (treat as absent).
4. **Interpolation DRY** — Re-export `formatMessage` from `@janus/bridge` (already depends on `@janus/languages`); `packages/ui/src/i18n.ts` calls bridge helper so UI does not import `services/*`.
5. **Manuscript containment (Phase 4)** — Reuse `realpath` + `isResolvedPathInsideRoot` pattern from `deleteBook` before read/write; defer if time-boxed (document risk in SPEC-library or ADR note).

## Dependency graph

```
uniqueDirectoryName (shared)
    ├── createBook collision-safe dirs
    ├── renameBook collision-safe moves
    └── migrate (refactor import only)

resolveBookDirById tests ── depends on stable dir rules (after Task 1–2)

normalizeJanusSettings ── independent (desktop + mobile)

chooseLibraryRoot + uiLocale test ── independent

formatMessage via bridge ── independent

manuscript realpath ── depends on path-containment helpers (after library tasks)
```

## Task list (summary)

| # | Title | Phase |
|---|--------|-------|
| 1 | Shared unique directory names + safe `createBook` | 1 — Blockers |
| 2 | Safe `renameBook` folder moves | 1 — Blockers |
| 3 | `resolveBookDirById` unit tests | 1 — Blockers |
| 4 | Normalize `janus-settings.json` on load | 2 — Hardening |
| 5 | Test `chooseLibraryRoot` preserves `uiLocale` | 2 — Hardening |
| 6 | Deduplicate `formatMessage` through bridge | 3 — DRY |
| 7 | Manuscript read/write path containment | 4 — Security (optional) |
| 8 | Spec note + re-ship checklist | 5 — Sign-off |

Details and checkboxes: `todo.md` in this folder.

## Checkpoints

### After Tasks 1–3 (blockers)

- [x] Collision regression tests pass (`foo/bar` vs `foobar`, etc.)
- [x] `bun run test` && `bun run lint`

### After Tasks 4–6

- [x] Settings corrupt-json manual: invalid `libraryRoot` type does not crash app
- [x] `bun run test` && `bun run build:ui`

### After Tasks 7–8 (if done)

- [x] Manuscript tests cover symlink escape (desktop fs mock)
- [x] SPEC-library slice 1e acceptance bullet for unique folders

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Disambiguated folder names differ from visible title | Low — id in manifest | Document; shelf UI shows `title` from manifest, not dirname |
| Rename allocates `"Title 2"` while user expected exact folder name | Low | Same as migration behavior today |
| `formatMessage` export from bridge blurs “UI must not import services” | Low | Bridge is the shell contract layer |
| Symlink fix changes mobile behavior | Med | Desktop-first test; mobile parity note in task 7 |

## Open questions

- **Task 7 scope:** Included in batch (done).
- **Re-run `/ship`:** left to maintainer (optional).
