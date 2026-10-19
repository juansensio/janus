---
description: List, add, remove, fill, or release rows in the Janus module work queue (tasks/queue.md)
---

> **Cursor:** Read skills at `.cursor/skills/<name>/SKILL.md` (not Claude Code `agent-skills:` plugin names). Janus module specs live at `docs/specs/SPEC-<module-id>.md` per `CAPABILITY-MAP.md`. Project constraints: `AGENTS.md`.

Read and follow `.cursor/skills/janus-queue/SKILL.md` for all modes, including the **launch checklist** (orchestrator only — do not restate here).

`/queue` maintains `tasks/queue.md`. It does not write slice plans or product code.

## Modes

`$ARGUMENTS` selects the mode.

| Invocation | Mode |
|---|---|
| `/queue`, `/queue list` | **List** (default) |
| `/queue add …` | **Add** — append one capability or idea row |
| `/queue remove …` | **Remove** — delete one row |
| `/queue fill from roadmap` | **Fill** — idea rows from `ROADMAP.md` gaps |
| `/queue fill gaps` | **Fill** — idea rows from `CAPABILITY-MAP.md` gaps |
| `/queue fill` | **Fill** — ask the user, then add rows |
| `/queue release <row>` | **Release** — clear Notes `local`, set `spec-draft` so orchestrator may launch |

**Orchestrator-Job** prompts must not run Fill or Release.

## Run

1. State the mode before editing.
2. **List** is read-only.
3. Other modes follow the skill exactly.
