# Archived plans

Each completed or superseded capability keeps its implementation plan and task list here. **Active** work always uses the repo-root pair:

- `tasks/plan.md`
- `tasks/todo.md`

When `/plan` starts a new `docs/specs/SPEC-<module-id>.md`, move the previous pair into `tasks/archive/<module-id>/` and write fresh root files (task numbers restart at 1).

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
