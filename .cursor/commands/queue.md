---
description: List, add, or remove rows in the Janus module work queue (tasks/queue.md)
---

> **Cursor:** Read skills at `.cursor/skills/<name>/SKILL.md` (not Claude Code `agent-skills:` plugin names). Janus module specs live at `docs/specs/SPEC-<module-id>.md` per `CAPABILITY-MAP.md`. Project constraints: `AGENTS.md`.

Read and follow `.cursor/skills/janus-queue/SKILL.md`.

`/queue` maintains `tasks/queue.md`. It does not write specs, plans, or code. `/spec` still writes the spec. `/plan` and `/build` still read the queue.

## Modes

`$ARGUMENTS` selects the mode.

| Invocation | Mode |
|---|---|
| `/queue`, `/queue list`, or “what is in the queue?” | **List** (default) |
| `/queue add …` | **Add** — append one row |
| `/queue remove …` | **Remove** — delete one matching row |

Anything that does not start with `add` or `remove` is **List**.

## Run

1. State the mode before editing.
2. **List** is read-only. Do not change `tasks/queue.md`.
3. **Add** and **Remove** change only that file: the matching table row and the **Current queue head** line.
4. Do not invent an approve, start, or done mode. Status on an existing row stays as written. A status is set only when **Add** includes one in the same message, and only when the skill allows it.
