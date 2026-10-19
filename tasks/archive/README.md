# Archived plans

Historical plans from before the **jobs** layout live here. **Do not add new slices to this tree** — from `SPEC-autonomous-queue.md` onward, slice plans stay under `tasks/jobs/<job>/slice-N/` after merge (see `tasks/jobs/README.md`).

**Active local session** still uses:

- `tasks/plan.md` — pointer to `Active slice: tasks/jobs/<job>/slice-N/`
- `tasks/todo.md` — mirror or summary; `/build` reads the slice folder when the pointer is set

When switching to a **different module** locally, archive the previous root `plan.md` / `todo.md` pair here (if it was only a root pair) and write a fresh pointer for the new slice.

| Archive folder | Spec | Notes |
|----------------|------|--------|
| `shell/` | `docs/specs/SPEC-shell.md` | Shell, ship-fixes, live reload (2026-10-18) |
| `library/` | `docs/specs/SPEC-library.md` | Slice 1 — shelf CRUD (2026-10-18) |
| `library-slice-1b/` | `docs/specs/SPEC-library.md` | Slice 1b — Neo shelf visual (2026-10-18; Task 7 manual optional) |
| `library-slice-1c/` | `docs/specs/SPEC-library.md` | Slice 1c — book naming (create + rename) (2026-10-18) |
| `library-slice-1d/` | `docs/specs/SPEC-library.md` | Slice 1d — wrapping shelf track (2026-10-18; Task 2 spec doc optional) |
| `manuscript-slice-1/` | `docs/specs/SPEC-manuscript.md` | Slice 1 — open, write, autosave (2026-10-18; manual sign-off) |
| `library-root-slice-1/` | `docs/specs/SPEC-library-root.md` | Slice 1 — configurable library directory (2026-10-18) |
| `library-root-slice-2-1e/` | `SPEC-library-root` slice 2 + `SPEC-library` slice 1e | Relocate on folder pick; title-based book dirs (2026-10-18). Wrap leftover → languages Task 8 |
| `languages-slice-1/` | `docs/specs/SPEC-languages.md` | Interface locale `en`/`es`, catalogs, Settings picker (2026-10-18) |
| `perf-command-phase-1/` | `docs/specs/SPEC-perf-command.md` | Janus `/perf` agent workflow (2026-10-18) |
| `idle-post-perf/` | — | Idle root plan before ship-gate fixes (2026-10-18) |
| `ship-gate-fixes/` | library / languages / library-root specs | `/ship` NO-GO fixes — unique dirs, settings, DRY i18n (2026-10-18) |
| `desktop-release/` | `SPEC-desktop-release` + command spec | macOS CI package + `/release` (2026-10-18; optional first `v*` tag) |
| `html-manuscript-ai-assist/` | `SPEC-manuscript-slice-2` + `SPEC-ai-assist` | Build phase Tasks 1–13 (2026-10-18; SIWC Connect deferred) |
| `ai-assist-siwc/` | `SPEC-ai-assist` + ADR SIWC | Sign in with ChatGPT Connect, refresh, revoke (2026-10-18; manual sign-off) |
| `ai-assist-write-instruction/` | `SPEC-ai-assist` | Write: prose context, JSON draft/refusal, comment status (2026-10-18; manual sign-off) |
| `idle-pre-zoom/` | — | Idle root plan before zoom slice (2026-10-18) |
| `zoom-slice-1/` | `docs/specs/SPEC-zoom.md` | Slice 1 — persisted zoom, Settings, shortcuts, View menu (2026-10-18) |
| `zoom-slice-2/` | `docs/specs/SPEC-zoom.md` | Slice 2 — editor zoom bar, page-scale zoom (2026-10-19) |
| `ai-assist-slice-3/` | `SPEC-ai-assist-slice-3-model-catalog-cache` | Cached model catalog, non-blocking editor (2026-10-19) |
