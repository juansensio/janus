---
name: janus-performance-audit
description: Runs Janus-scoped UI performance audits for /perf. Use when auditing packages/ui, editor typing/autosave, shelf/settings navigation, or dist/ui bundle weight in Electron/Capacitor shells — not for services/* domain code or public-website CrUX/PSI.
---

# Janus performance audit

## Overview

Janus ships one Vite bundle (`packages/ui`) inside Electron and Capacitor. `/perf` measures **writer-facing responsiveness** (shelf, editor, settings), not SEO or production CrUX.

Read this skill when executing `.cursor/commands/perf.md`. Also load:

- `.cursor/skills/performance-optimization/SKILL.md` — measure-before-optimize workflow
- `.cursor/skills/browser-testing-with-devtools/SKILL.md` — Deep mode traces and Lighthouse via MCP
- `docs/specs/SPEC-perf-command.md` — scope, boundaries, checklist
- `reference.md` in this folder — dev URL, surfaces, selectors

## When to use

- Before large UI changes (editor, shelf, mount, settings)
- When the user asks for a performance report on Janus
- After a suspected typing lag, save jank, or bundle regression

**When NOT to use:** `services/*` rule changes, CLI/scripts, Electron main-only work (unless user expands scope).

## Modes

### Quick mode (default)

No Lighthouse, trace, or live dev server required. Static review of:

- `packages/ui/src/**/*`
- `packages/ui/vite.config.ts`, `index.html`, `mobile.html`

Apply the checklist in `SPEC-perf-command.md` § Quick mode checklist. Label each finding **potential impact** unless tied to a metric.

Optional: run `bun run build:ui` and record `dist/ui` asset sizes in the scorecard (prod-like, not a gate).

### Deep mode

Use when **any** of:

- Lighthouse JSON path or pasted content (lab / dev URL)
- DevTools performance trace
- `cursor-ide-browser` or Chrome DevTools MCP available **and** dev server reachable

Prerequisites:

```bash
bun run dev:desktop   # preferred — bridge + editor saves
# or
bun run dev:ui
```

Base URL: `http://127.0.0.1:${JANUS_UI_DEV_PORT:-5173}/`

Audit each **surface** in `reference.md` (shelf → editor → settings). Label metrics **synthetic / dev** or **prod-like build**. Never report CrUX/PSI as Janus SLA.

If Deep was intended but the server is down or MCP is missing, list missing inputs and fall back to Quick for the requested files.

## Required report shape

Return this structure to the user (fill scorecard only with sourced values):

```markdown
## Scope
- Mode: Quick | Deep
- Environment: dev URL | prod-like build | source-only
- Paths: …

## Scorecard (Janus /perf)
| Signal | Value | Source | Surface |
|--------|-------|--------|---------|
| … | … | … | … |

## Ranked findings
1. [Critical|High|Medium|Low] … (file:line)

## Positive observations
- …

## Proactive recommendations
- …
```

## Exclusions (default)

- `services/**/*` (except noting if UI imports domain JSON against layering)
- `apps/desktop/src/main.ts`, preload, mobile native bridges
- PageSpeed Insights / CrUX as production targets
- iOS Instruments automation (manual checklist only in v1)

## Layering

Presentation (`packages/ui`) displays values; it must not own business rules (`AGENTS.md` invariant 12). If the bottleneck is catalog resolution or save rules, file the finding against the owning `services/*` module in recommendations — do not “fix” rules inside renderers during a perf pass without a spec.
