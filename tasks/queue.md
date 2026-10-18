# Module work queue

Autonomous agents read this file **after** `CAPABILITY-MAP.md`. Status drives what to build next.

## Status values

| Status | Meaning |
|--------|---------|
| `idea` | Backlog only — no implementing spec |
| `spec-draft` | Spec exists but is not approved for build |
| `spec-approved` | Spec (or slice) is approved — agent may `/plan` then `/build` |
| `in-progress` | Active `tasks/plan.md` / `tasks/todo.md` for this item |
| `done` | Shipped; plan archived under `tasks/archive/` |

## How humans approve work

1. Finish or update the module spec in `docs/specs/SPEC-<module-id>.md` (or slice spec such as `SPEC-manuscript-slice-2.md`).
2. Set the spec’s status line to **Approved** with a date (match existing specs).
3. Update `CAPABILITY-MAP.md` if build order or dependencies changed.
4. Set the matching row below to **`spec-approved`** (or `in-progress` once `/plan` has written root `tasks/plan.md`).
5. Agents do **not** treat CAPABILITY-MAP prose alone as approval — this queue row must be `spec-approved`.

**Current queue head:** none (`spec-approved` empty). Run `/plan` after the next approval.

---

## Capability modules (build order)

| Order | Module / slice | Status | Spec | Notes |
|------:|----------------|--------|------|-------|
| 1 | shell | done | `docs/specs/SPEC-shell.md` | Archived `tasks/archive/shell/` |
| 2 | library — slice 1 (shelf CRUD) | done | `docs/specs/SPEC-library.md` | Archived `tasks/archive/library/` |
| 3 | library — slice 1b (Neo shelf) | done | `docs/specs/SPEC-library.md` | `tasks/archive/library-slice-1b/` |
| 4 | library — slice 1c (naming) | done | `docs/specs/SPEC-library.md` | `tasks/archive/library-slice-1c/` |
| 5 | library — slice 1d (wrapping track) | done | `docs/specs/SPEC-library.md` | `tasks/archive/library-slice-1d/` |
| 6 | manuscript — slice 1 | done | `docs/specs/SPEC-manuscript.md` | `tasks/archive/manuscript-slice-1/` |
| 7 | library-root — slice 1 | done | `docs/specs/SPEC-library-root.md` | `tasks/archive/library-root-slice-1/` |
| 8 | library-root — slice 2 + library 1e | done | `docs/specs/SPEC-library-root.md`, `docs/specs/SPEC-library.md` | `tasks/archive/library-root-slice-2-1e/` |
| 9 | languages — slice 1 | done | `docs/specs/SPEC-languages.md` | `tasks/archive/languages-slice-1/` |
| 10 | perf — `/perf` command | done | `docs/specs/SPEC-perf-command.md` | `tasks/archive/perf-command-phase-1/` |
| 11 | ship-gate fixes | done | library / languages / library-root specs | `tasks/archive/ship-gate-fixes/` |
| 12 | desktop-release v1 | done | `docs/specs/SPEC-desktop-release.md`, `docs/specs/SPEC-desktop-release-command.md` | `tasks/archive/desktop-release/` |
| 13 | manuscript — slice 2 (HTML) | done | `docs/specs/SPEC-manuscript-slice-2.md` | Built with row 14; `tasks/archive/html-manuscript-ai-assist/` |
| 14 | ai-assist — slice 1 (SIWC, Write) | done | `docs/specs/SPEC-ai-assist.md` | `tasks/archive/html-manuscript-ai-assist/`, `ai-assist-siwc/`, `ai-assist-write-instruction/` |
| 15 | ai-assist — slice 2 (usage ledger) | spec-draft | `docs/specs/SPEC-ai-assist-slice-2.md` | Spec status **Deferred** (2026-10-18) — not queued for build |
| — | library (full Neo loop) | spec-draft | `docs/specs/SPEC-library.md` | Further slices not approved beyond archived work |
| — | languages (per-book writing language) | idea | `docs/specs/SPEC-languages.md` | Slice 1 shipped; later slices not specified |
| — | manuscript (chapters, breaks, …) | idea | `docs/specs/SPEC-manuscript.md` | Slice 1–2 shipped; map “full loop” not spec’d |

Active plan: **none** (`tasks/plan.md` idle). Nothing marked `in-progress`.

---

## ROADMAP ideas (not specs)

Informal items from `ROADMAP.md` — status **`idea`** until a spec is drafted and approved.

| Area | Idea | Status |
|------|------|--------|
| UI | Zoom page | idea |
| UI | Side panels (nav left, comments right) | idea |
| UI | Reference documents side-by-side | idea |
| AI | Text highlight rewrite | idea |
| AI | Per-comment model override (beyond shipped settings) | idea |
| Features | PDF export | idea |
| Features | Reference documents (worldbuilding, characters, …) | idea |
| Features | Agents (reviewer, canon, …) | idea |
