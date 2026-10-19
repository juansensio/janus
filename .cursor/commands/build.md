---
description: Implement tasks incrementally — build, test, verify, commit. Add "auto" to run the whole plan in one approved pass.
---

> **Cursor:** Read skills at `.cursor/skills/<name>/SKILL.md` (not Claude Code `agent-skills:` plugin names). Janus module specs live at `docs/specs/SPEC-<module-id>.md` per `CAPABILITY-MAP.md`. Project constraints: `AGENTS.md`.

Read and follow `.cursor/skills/incremental-implementation/SKILL.md` alongside `.cursor/skills/test-driven-development/SKILL.md`.

## Task list location

1. Read `tasks/plan.md`. If it contains `Active slice: tasks/jobs/<path>/`, load **`todo.md`** from that folder (and use that folder’s `plan.md` for context).
2. Otherwise use root **`tasks/todo.md`**.

## Modes

- **`/build`** — implement the *next* pending task, then stop (careful, one slice at a time).
- **`/build auto`** / **`/build all`** — implement every pending task without stopping between them.

`$ARGUMENTS` selects the mode. Treat `auto` (canonical) or `all` as autonomous mode.

## Orchestrator slice jobs

If the session prompt includes a line **`Orchestrator-Job:`**, skip the plan-approval wait in autonomous mode (step 4 below). Follow `.cursor/rules/janus-autonomy.mdc` and `docs/specs/SPEC-autonomous-queue.md`.

## Default: one task

Pick the next pending task from the resolved task list. Then:

1. Read the task's acceptance criteria
2. Load relevant context (existing code, patterns, types)
3. For **product code**, write a failing test (RED), implement (GREEN), run `bun run test` and `bun run lint`
4. For **markdown-only workflow tasks**, verify by reading the changed files per acceptance criteria
5. Commit with a descriptive message when the user requested commits (`/build auto` / `all`)
6. Mark the task complete in both the slice `todo.md` and root `tasks/todo.md` when both exist
7. Stop after one task unless mode is `auto` / `all`

## Autonomous: the whole plan (`/build auto` / `all`)

1. **Require a spec** at `docs/specs/SPEC-*.md` or equivalent.
2. **Clean baseline** — `git status --porcelain`; stop on unrelated dirty files outside planning artifacts and `tasks/jobs/`.
3. **Plan if needed** — run `/plan` flow if no plan for the active slice.
4. **Plan approval** — wait for human approval **unless** `Orchestrator-Job:` is present in the prompt.
5. **Execute every task** in order; one commit per task when committing.
6. **Stop and ask** on ambiguous spec, dangerous/important boundaries, or unfixable test failures.
7. **Summarize** at the end.

If any step fails, follow `.cursor/skills/debugging-and-error-recovery/SKILL.md`.
