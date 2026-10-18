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

Save the plan to `tasks/plan.md` and the task list to `tasks/todo.md`.

Follow **Janus plan/todo lifecycle** in `.cursor/rules/janus-planning.mdc` (archive previous module, fresh root `tasks/plan.md` + `tasks/todo.md`, tasks restart at 1).

If the current plan still has **unchecked tasks for in-progress work** on the same module, stop and ask before archiving or overwriting.
