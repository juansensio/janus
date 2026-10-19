---
description: Start spec-driven development — write a structured specification before writing code
---

> **Cursor:** Read skills at `.cursor/skills/<name>/SKILL.md` (not Claude Code `agent-skills:` plugin names). Janus module specs live at `docs/specs/SPEC-<module-id>.md` per `CAPABILITY-MAP.md`. Project constraints: `AGENTS.md`.

Read and follow `.cursor/skills/spec-driven-development/SKILL.md`.

Begin by understanding what the user wants to build. Ask clarifying questions about objective, acceptance criteria, constraints, and boundaries.

Save the spec as `docs/specs/SPEC-<module-id>.md` (kebab-case id). Confirm with the user before proceeding to `/plan`.

## Queue (local `/spec`)

In the same turn after saving the spec, update `tasks/queue.md`:

- If no capability row exists for this module/slice, **Add** one (see `.cursor/skills/janus-queue/SKILL.md`).
- Set **Spec** path, status **`spec-draft`**, Notes **`local`**.

Do **not** set `spec-approved` unless the user explicitly approves in the message. Do **not** start a cloud job.
