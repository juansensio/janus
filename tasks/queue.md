# Module work queue

Autonomous agents read this file **after** `CAPABILITY-MAP.md`. The Grok orchestrator refreshes status here and launches slice jobs per `.cursor/skills/janus-queue/SKILL.md`.

## Status values

| Status | Meaning |
|--------|---------|
| `idea` | Backlog — may be launched by orchestrator when not `local` and dependencies are met |
| `spec-draft` | Spec exists — orchestrator or human may plan/build when not `local` |
| `spec-approved` | Spec approved — may `/plan` then `/build` locally |
| `in-progress` | Active slice plan under `tasks/jobs/<job>/slice-N/` or root pointer |
| `running` | Cloud agent working this row |
| `pr-open` | Pull request open — waiting for human review |
| `needs-decision` | Blocked on dangerous/important choice — see PR `Needs-Decision` |
| `deferred` | Paused — orchestrator does not launch until status changes |
| `done` | Pull request **merged** to default branch; slice plan stays under `tasks/jobs/` |

**Notes:** `local` means a human Cursor session owns the row; the orchestrator does not launch it until `/queue release`. Substring **`no auto-spec`** in Notes means the row has no concrete slice scope yet — orchestrator does not launch it.

## Needs behavior

Capability rows may name another row’s **Module / slice** cell. Empty means the row may run in parallel with others. A dependent row launches only when every named row is `done` (merged). File overlap is not a dependency.

## How humans approve product work

1. Finish or update the module spec in `docs/specs/SPEC-<module-id>.md`.
2. Set the spec’s status line to **Approved** with a date.
3. Update `CAPABILITY-MAP.md` if build order or dependencies changed.
4. Set the matching queue row to **`spec-approved`** (or `in-progress` after `/plan`).
5. Agents do **not** treat CAPABILITY-MAP prose alone as approval — this queue row must reflect approval.

Workflow-only specs (for example `SPEC-autonomous-queue.md`) follow the same queue row pattern but are not CAPABILITY-MAP modules.

**Current queue head:** none (`spec-approved` empty for local `/plan`). **Orchestrator trial wave (parallel, launch checklist):** rows 19–21 — `support-docs — slice 1`, `ai-highlight — slice 1`, `pdf-export — slice 1` (all `idea`, empty Needs behavior, not `local`).

---

## Capability modules (build order)

| Order | Module / slice | Status | Spec | Needs behavior | Notes |
|------:|----------------|--------|------|----------------|-------|
| 1 | shell | done | `docs/specs/SPEC-shell.md` | | Archived `tasks/archive/shell/` |
| 2 | library — slice 1 (shelf CRUD) | done | `docs/specs/SPEC-library.md` | | Archived `tasks/archive/library/` |
| 3 | library — slice 1b (Neo shelf) | done | `docs/specs/SPEC-library.md` | | `tasks/archive/library-slice-1b/` |
| 4 | library — slice 1c (naming) | done | `docs/specs/SPEC-library.md` | | `tasks/archive/library-slice-1c/` |
| 5 | library — slice 1d (wrapping track) | done | `docs/specs/SPEC-library.md` | | `tasks/archive/library-slice-1d/` |
| 6 | manuscript — slice 1 | done | `docs/specs/SPEC-manuscript.md` | | `tasks/archive/manuscript-slice-1/` |
| 7 | library-root — slice 1 | done | `docs/specs/SPEC-library-root.md` | | `tasks/archive/library-root-slice-1/` |
| 8 | library-root — slice 2 + library 1e | done | `docs/specs/SPEC-library-root.md`, `docs/specs/SPEC-library.md` | | `tasks/archive/library-root-slice-2-1e/` |
| 9 | languages — slice 1 | done | `docs/specs/SPEC-languages.md` | | `tasks/archive/languages-slice-1/` |
| 10 | perf — `/perf` command | done | `docs/specs/SPEC-perf-command.md` | | `tasks/archive/perf-command-phase-1/` |
| 11 | ship-gate fixes | done | library / languages / library-root specs | | `tasks/archive/ship-gate-fixes/` |
| 12 | desktop-release v1 | done | `docs/specs/SPEC-desktop-release.md`, `docs/specs/SPEC-desktop-release-command.md` | | `tasks/archive/desktop-release/` |
| 13 | manuscript — slice 2 (HTML) | done | `docs/specs/SPEC-manuscript-slice-2.md` | | Built with row 14; `tasks/archive/html-manuscript-ai-assist/` |
| 14 | ai-assist — slice 1 (SIWC, Write) | done | `docs/specs/SPEC-ai-assist.md` | | `tasks/archive/html-manuscript-ai-assist/`, etc. |
| 15 | ai-assist — slice 2 (usage ledger) | deferred | `docs/specs/SPEC-ai-assist-slice-2.md` | | Usage ledger deferred 2026-10-18 — revive via `/spec` + status change |
| 16 | zoom — slices 1–2 | done | `docs/specs/SPEC-zoom.md` | | `tasks/jobs/zoom/` not migrated; archive `tasks/archive/zoom-slice-*` |
| 17 | ai-assist — slice 3 (model catalog cache) | done | `docs/specs/SPEC-ai-assist-slice-3-model-catalog-cache.md` | | Shipped 2026-10-19 |
| 18 | autonomous-queue — slice 1 | done | `docs/specs/SPEC-autonomous-queue.md` | | Shipped 2026-10-19; `tasks/jobs/autonomous-queue/slice-1/` |
| 19 | support-docs — slice 1 | idea | — | | Book project: manuscript + one free-text support doc (e.g. worldbuilding); open/switch; no templates — orchestrator `/spec` at launch |
| 20 | ai-highlight — slice 1 | idea | — | | Highlight → rewrite selection; Accept/Reject; reuse existing ai-assist pipeline — orchestrator `/spec` at launch |
| 21 | pdf-export — slice 1 | idea | — | | Desktop: export open book manuscript to one PDF file; minimal layout — orchestrator `/spec` at launch |
| — | library (full Neo loop) | deferred | `docs/specs/SPEC-library.md` | | no auto-spec — Neo loop not sliced |
| — | languages (per-book writing language) | idea | `docs/specs/SPEC-languages.md` | | no auto-spec — slice TBD |
| — | manuscript (chapters, breaks, …) | idea | `docs/specs/SPEC-manuscript.md` | | no auto-spec — slice TBD |

---

## ROADMAP ideas (not specs)

Informal items from `ROADMAP.md` — status **`idea`** until a spec is drafted. **Never launched** by the orchestrator (capability table only).

| Area | Idea | Status |
|------|------|--------|
| UI | Zoom page | done (`SPEC-zoom.md`, slices 1–2) |
| UI | Side panels (nav left, comments right) | idea |
| UI | Reference documents side-by-side | idea |
| AI | Text highlight rewrite | promoted → capability row 20 |
| AI | Per-comment model override (beyond shipped settings) | idea |
| Features | PDF export | promoted → capability row 21 |
| Features | Reference documents (worldbuilding, characters, …) | promoted → capability row 19 |
| Features | Agents (reviewer, canon, …) | idea |
