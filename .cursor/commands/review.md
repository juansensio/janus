---
description: Conduct a five-axis code review — correctness, readability, architecture, security, performance
---

> **Cursor:** Read skills at `.cursor/skills/<name>/SKILL.md` (not Claude Code `agent-skills:` plugin names). Janus module specs live at `docs/specs/SPEC-<module-id>.md` per `CAPABILITY-MAP.md`. Project constraints: `AGENTS.md`.

Read and follow `.cursor/skills/code-review-and-quality/SKILL.md`.

Review the current changes (staged or recent commits) across all five axes:

1. **Correctness** — Does it match the spec? Edge cases handled? Tests adequate?
2. **Readability** — Clear names? Straightforward logic? Well-organized?
3. **Architecture** — Follows existing patterns? Clean boundaries? Right abstraction level?
4. **Security** — Input validated? Secrets safe? Auth checked? (Use security-and-hardening skill)
5. **Performance** — No N+1 queries? No unbounded ops? (Use performance-optimization skill)

Categorize findings as Critical, Required, Optional, or Nit.
Output a structured review with specific file:line references and fix recommendations.
