---
description: Janus UI performance audit — shelf, editor, settings (Quick or Deep via dev desktop)
---

> **Cursor:** Read skills at `.cursor/skills/<name>/SKILL.md` (not Claude Code `agent-skills:` plugin names). Janus module specs live at `docs/specs/SPEC-<module-id>.md` per `CAPABILITY-MAP.md`. Project constraints: `AGENTS.md`.

**Spec:** `docs/specs/SPEC-perf-command.md`

`/perf` audits **Janus presentation** (`packages/ui` in Electron/Capacitor). It is not a generic public-website audit. Do not use it for `services/*`, CLIs, or server-only code.

Read and follow `.cursor/skills/janus-performance-audit/SKILL.md` (and `reference.md` for surfaces). Also use `performance-optimization` and, in Deep mode, `browser-testing-with-devtools`.

## Determine the mode

**Deep mode** — when any of these is available:

- Lighthouse JSON (e.g. `npx lighthouse http://127.0.0.1:5173/ --output json --output-path ./tmp/lighthouse.json --only-categories=performance`)
- A DevTools performance trace (file or MCP)
- Live dev server at `http://127.0.0.1:${JANUS_UI_DEV_PORT:-5173}/` **and** browser/DevTools MCP to navigate shelf → editor → settings (see `reference.md`)
- User pasted Lighthouse or trace JSON

Start the app when needed:

```bash
bun run dev:desktop    # UI + Electron (preferred for editor/autosave)
# or
bun run dev:ui
```

**Quick mode** — default when none of the above apply. Scan `packages/ui/src` (and vite/html per spec). Label findings **potential impact** unless measured.

Optional prod-like context: `bun run build:ui` and note `dist/ui` asset sizes (not a CI gate in v1).

## Run the audit

Do **not** spawn a `web-performance-auditor` subagent. Perform the audit in this session:

1. State **scope** (paths), **mode** (Quick/Deep), and **environment** (dev vs prod-like build).
2. If Deep was requested but inputs are missing, say what is missing (dev server, MCP, artifact) and continue Quick on the given diff/files.
3. Apply the Janus checklist from the spec; for Deep, visit each surface in `reference.md`.
4. Emit the report shape from `janus-performance-audit/SKILL.md` (scorecard, ranked findings, positives, recommendations).

## Output

Return the full audit report to the user. No merge step.
