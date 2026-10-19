---
name: janus-queue
description: Queue list/add/remove/fill/release and orchestrator launch checklist for tasks/queue.md. Use for /queue, Grok orchestrator waves, and drift checks. Launch rules live only in this skill.
---

# Janus queue

## Overview

`tasks/queue.md` is the shared work list for **local** Cursor sessions and the **Grok orchestrator**. Slice jobs use `Orchestrator-Job:` (see `docs/specs/SPEC-autonomous-queue.md`). This skill is the **only** home for the launch checklist — commands and rules link here; they do not copy the checklist.

**Orchestrator-Job** prompts may **not** use Fill, Release, Add, or Remove, and must not edit `tasks/queue.md`.

## When to Use

- `/queue` list, add, remove, fill, release
- Grok orchestrator before launching cloud agents
- Drift checks between queue, specs, and `CAPABILITY-MAP.md`

**When NOT to use:** Implementing a slice (`/build`), writing specs (`/spec`), or planning (`/plan`) except where those commands call back to queue updates documented here.

---

## Orchestrator wave (Grok bot)

Before each launch wave:

1. Read open and merged PRs and running cloud agents. Map each to a **Module / slice** row via PR body `Queue-Row:`.
2. On a **queue-only branch**, update status cells in `tasks/queue.md`: `running`, `pr-open`, `needs-decision`, or `done` (merged). Open a PR that touches **only** `tasks/queue.md`.
3. Leave rows with Notes **`local`** or status **`in-progress`** unchanged **unless** that row already has a PR — then set `pr-open` and clear `local`.
4. Apply **Launch checklist** below. Launch one cloud agent per returned row with the brief from `SPEC-autonomous-queue.md`.

---

## Launch checklist

A capability row is **launchable** when **all** are true:

- Row is in the **capability** table (not ROADMAP ideas).
- Status is `idea`, `spec-draft`, or `spec-approved`.
- Notes is **not** `local`.
- Status is **not** `running`, `in-progress`, `pr-open`, `needs-decision`, or `done`.
- **Needs behavior** is empty, or every named row has status `done` (merged).
- Every name in **Needs behavior** matches some capability row’s Module / slice cell. If not, **stop and ask the human** — do not launch.

Return launchable rows in **table order** (ascending Order). Launch **all** of them that pass (parallel when independent).

### Worked examples (walk these when verifying)

| Situation | Launch? |
|-----------|---------|
| Two rows, status `idea`, empty Needs behavior, not in PR snapshot | Both, table order |
| `comments panel` needs `side panels`; `side panels` is `pr-open` | Neither of those two |
| Independent third row `idea`, empty Needs behavior | Third row only |
| `comments panel` needs `side panels`; `side panels` is `done` | `comments panel` |
| Row `running`, `in-progress`, `pr-open`, `needs-decision`, or `done` | No |
| Row `spec-draft`, Notes `local` | No |
| Same row after `/queue release` (no `local`), dependencies met | Yes |
| Needs behavior names a missing row | Stop; ask human |
| ROADMAP ideas table row | Never |
| `tasks/jobs/zoom/slice-1/` exists, row `done`; new `zoom — slice 2` queued | Launch slice 2 when checklist passes; do not edit `slice-1/` |

---

## Process: List (default)

Read-only. Report:

1. **Current queue head** — first capability row that is `spec-approved` or `in-progress` with an active local slice, or name the orchestrator’s next launchable set (checklist).
2. Both tables unchanged.
3. Counts by status (include `running`, `pr-open`, `needs-decision` when present).
4. **Drift**, each item named:
   - Spec `Status: **Approved**` but row not `spec-approved` / `in-progress` / `done`
   - Spec path not a file
   - `CAPABILITY-MAP.md` module id with no queue row mentioning it
   - **Needs behavior** names a row that does not exist

Do not edit the file during List.

---

## Process: Add

Append **one** row. Capability table columns:

| Order | Module / slice | Status | Spec | Needs behavior | Notes |

- **Order:** max existing Order + 1.
- **Needs behavior:** empty or exact Module / slice text of another capability row.
- **Status:** default `idea` unless the user names another allowed status in the same message.
- **`spec-approved`:** only when the user names it **and** the spec file has `Status: **Approved**`.
- **Notes:** user clause, `local`, or `—`.

Ideas table: `| Area | Idea | Status |` — never `spec-approved` / `in-progress` / `done` without a spec path.

Update **Current queue head** after Add (see below).

---

## Process: Remove

Delete **one** row. Match Module / slice or Idea cell exactly (case-insensitive). `in-progress` → stop and ask. `done` → warn, then delete if user insisted.

Leave specs, `tasks/jobs/`, `tasks/archive/`, and `CAPABILITY-MAP.md` untouched.

---

## Process: Fill

Only when the **user’s message** asks (not from Orchestrator-Job).

| Mode | Action |
|------|--------|
| `fill from roadmap` | For each `ROADMAP.md` bullet with no matching idea/capability row, append an **ideas** row (`idea`) |
| `fill gaps` | For capability-map modules/slices with no queue row and no shipped spec slice, append **ideas** or capability rows as `idea` |
| `fill` | Ask what the user wants, then Add those rows |

Never set `spec-approved` or start jobs from Fill.

---

## Process: Release

`/queue release <row>` — match one Module / slice cell.

- Clear Notes (`local` → `—` or empty).
- Set status to **`spec-draft`** (or `spec-approved` if spec is Approved and user asked).

Orchestrator may launch on the next wave if the checklist passes.

---

## Current queue head

After Add or Remove:

- Prefer reporting first `spec-approved` row for **local** `/plan` hints, **or** state that orchestrator launchables come from the checklist.
- If no `spec-approved`: `**Current queue head:** none (\`spec-approved\` empty for local plan). Orchestrator: see launch checklist.`

---

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll copy the launch checklist into autonomy.mdc" | Duplication drifts. Link to this skill only. |
| "Ideas table rows can run overnight" | Only capability rows launch. |
| "Open PR counts as done for Needs behavior" | Only **merged** (`done`) satisfies behavior deps. |
| "Orchestrator-Job can /queue fill" | Forbidden — human message only. |

## Red Flags

- Launching a `local` or `in-progress` row
- Slice job editing `tasks/queue.md`
- Restating the checklist in `.cursor/commands/queue.md`
- Moving new slice plans into `tasks/archive/`

## Verification

- [ ] Launch checklist and examples match `SPEC-autonomous-queue.md` Testing strategy
- [ ] List did not write the file
- [ ] Fill/Release refused for Orchestrator-Job
- [ ] Add/Remove touched only `tasks/queue.md` (plus head line)
