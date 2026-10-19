---
description: Break work into small verifiable tasks with acceptance criteria and dependency ordering
---

> **Cursor:** Read skills at `.cursor/skills/<name>/SKILL.md` (not Claude Code `agent-skills:` plugin names). Janus module specs live at `docs/specs/SPEC-<module-id>.md` per `CAPABILITY-MAP.md`. Project constraints: `AGENTS.md`.

Read and follow `.cursor/skills/planning-and-task-breakdown/SKILL.md`.

Read the existing spec (`docs/specs/SPEC-*.md`, `SPEC.md`, or equivalent) and the relevant codebase sections. Then:

1. Enter plan mode — read only, no code changes
2. Identify the dependency graph between components
3. Slice work vertically (one complete path per task, not horizontal layers)
4. Write tasks with acceptance criteria and verification steps
5. Add checkpoints between phases
6. Present the plan for human review

## Where plans live

Follow `.cursor/rules/janus-planning.mdc`.

1. Resolve **job** id from the spec path (`SPEC-<job>.md` → `<job>`).
2. Resolve **slice** folder: `slice-N` (next N under `tasks/jobs/<job>/`, or `slice-1` if new).
3. Write **`tasks/jobs/<job>/slice-N/plan.md`** and **`todo.md`** (full plan and tasks).
4. Set root **`tasks/plan.md`** to a short pointer, including `Active slice: tasks/jobs/<job>/slice-N/`.
5. Mirror or summarize tasks in root **`tasks/todo.md`** so `/build` can find them before the pointer is read (optional duplicate; prefer pointer).

## Queue (local session)

In the same turn, update `tasks/queue.md` for this slice row:

- Set status **`in-progress`**
- Set Notes **`local`**
- Upsert the capability row if missing (see `.cursor/skills/janus-queue/SKILL.md` Add)

Do **not** start a cloud job. Do **not** move plans to `tasks/archive/` when planning a new slice.

If the current slice still has **unchecked tasks**, stop and ask before replacing the pointer — unless the user explicitly discards or archives.
