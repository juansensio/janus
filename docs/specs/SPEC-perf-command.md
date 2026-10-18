# Spec: Janus performance command (`/perf`)

> Status: **approved** (2026-10-18).  
> **Not a CAPABILITY-MAP module.** This spec defines agent/dev workflow only (`.cursor/commands` + optional scripts). It does not ship user-facing product behavior.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. The primary perf surface is `packages/ui` (Vite bundle) in Chromium: Electron renderer (desktop) and Capacitor WebView (mobile).
2. Deep audits use a **dev URL** (`http://127.0.0.1:<port>/` from `bun run dev:desktop` / `bun run dev:ui`) or **built artifacts** under `dist/ui/` — not a public production URL, CrUX, or PageSpeed Insights field data.
3. v1 replaces or supersedes generic `.cursor/commands/webperf.md` with a Janus-scoped command; we do not add `web-vitals` to the product bundle until a separate product decision.
4. The auditor persona is implemented via existing skills (`performance-optimization`, `browser-testing-with-devtools`) and/or a dedicated `.cursor/skills/janus-performance-audit/SKILL.md` — not a separate `web-performance-auditor` subagent type (not present in this repo’s agent harness).
5. Mobile deep automation (Simulator + Instruments) is **documented checklist only** in v1; desktop Chromium is the default deep target.
→ Correct me now or approve and we proceed with these.
```

## Objective

Janus is a **local-first writing app**: one shared web UI in two shells. Writers care that the **shelf, editor, and settings stay responsive** while typing, autosaving markdown to disk, and switching screens — not that a marketing site scores 100 on Lighthouse.

Convert the generic `/webperf` command into **`/perf`**, a performance audit workflow that:

1. **Scopes correctly** — audits presentation and shell-adjacent loading behavior; ignores `services/*`, pure bridge types, and Electron main-process code except where it blocks the renderer.
2. **Matches how we run the app** — dev server on `JANUS_UI_DEV_PORT` (default `5173`), `bun run dev:desktop`, and production-like `bun run desktop:prod` / `bun run build:ui`.
3. **Uses Janus-relevant signals** — editor interaction latency, autosave cadence, navigation shelf ↔ editor, bundle weight of `dist/ui`, and optional Lighthouse lab scores against the dev URL with explicit caveats.
4. **Produces actionable output** — ranked findings with file references, sourced metrics only in deep mode, and “potential impact” labels in quick mode.

### User stories

- As a **contributor**, when I change the editor or shelf, I can run `/perf` and get findings limited to `packages/ui` (and stated shell hooks) without wading through irrelevant “website SEO” guidance.
- As a **reviewer**, when deep mode is available, I can audit **shelf**, **editor**, and **settings** routes with Chrome DevTools MCP against the local Vite URL.
- As a **maintainer**, I can optionally add a **bundle size budget** script later without changing the command’s core contract.

### Acceptance criteria (command behavior)

- Invoking `/perf` without artifacts runs **Quick mode** on the agreed file globs and Janus anti-patterns (see Testing Strategy).
- When the user provides Lighthouse JSON, a performance trace, or Chrome DevTools MCP is available **and** `dev:desktop` / `dev:ui` is reachable, the command runs **Deep mode** against named **surfaces**: `shelf`, `editor`, `settings` (URLs or navigation steps documented in the command).
- The report **never** claims CrUX/PSI production scores for Janus; lab metrics are labeled **synthetic / dev** or **prod-like build**.
- Findings outside scope (`services/languages` message resolution, IPC handlers in main, etc.) are **excluded** unless the user explicitly expands scope.
- Generic `/webperf` is either **removed**, **aliased** to `/perf`, or reduced to a one-line pointer to `/perf` and this spec.

## Tech stack

| Piece | Choice |
|--------|--------|
| UI runtime | Vite 6, `packages/ui` → `dist/ui` |
| Desktop deep target | Chromium via Electron + `http://127.0.0.1:<port>/` (dev) |
| Mobile | Capacitor WebView; manual Simulator checks in v1 |
| Agent entry | `.cursor/commands/perf.md` |
| Skills | `performance-optimization`, `browser-testing-with-devtools`; optional `janus-performance-audit` |
| Measurement (optional scripts) | `vite build` output size; future `rollup-plugin-visualizer` or `vite-bundle-visualizer` (ask first) |

## Commands

Prerequisites for **Deep mode (desktop)**:

```bash
# Terminal A — UI only
bun run dev:ui

# Or UI + Electron (preferred for editor + bridge)
bun run dev:desktop
```

Default audit URL (document in command):

```text
http://127.0.0.1:${JANUS_UI_DEV_PORT:-5173}/
```

Production-like bundle (Quick / optional Deep):

```bash
bun run build:ui
# Artifacts: dist/ui/index.html, dist/ui/mobile.html, dist/ui/assets/*
```

Optional Lighthouse (lab only; user or agent runs, passes JSON path):

```bash
npx lighthouse "http://127.0.0.1:5173/" --output json --output-path ./tmp/lighthouse-shelf.json --only-categories=performance
```

Chrome DevTools MCP (when configured): `lighthouse_audit`, `performance_*` tools against the same origin — see `.cursor/skills/browser-testing-with-devtools/SKILL.md`.

**Out of scope for v1 command text:** PageSpeed Insights API, CrUX API, public URL audits.

## Project structure

```text
.cursor/commands/perf.md              → Janus /perf workflow (replaces webperf.md)
.cursor/skills/janus-performance-audit/
  SKILL.md                            → optional: Janus scopes, surfaces, scorecard template
  reference.md                        → optional: URL paths, repro steps shelf/editor/settings
docs/specs/SPEC-perf-command.md       → this spec

# Optional later (Phase 2 — ask first)
scripts/perf/bundle-budget.ts         → fail if dist/ui exceeds thresholds
.github/workflows/                    → optional CI bundle check
```

**Audit scope (default globs):**

| Include | Exclude |
|---------|---------|
| `packages/ui/src/**/*` | `services/**/*` |
| `packages/ui/vite.config.ts` | `apps/desktop/src/main.ts` (unless user asks) |
| `packages/ui/index.html`, `mobile.html` | `apps/mobile/ios/**` |
| Bridge **call patterns** from UI only | Domain message catalogs (`services/languages`) except bundle/import cost |

## Code style

Command and skill prose: imperative steps, link to this spec and `docs/architecture.md` layering. No new product code required for v1.

Example **scorecard section** the agent must emit (metrics filled only when sourced):

```markdown
## Scorecard (Janus /perf)

| Signal | Value | Source | Surface |
|--------|-------|--------|---------|
| `dist/ui` JS gzip (index entry) | — | `build:ui` + du | prod-like |
| LCP | — | Lighthouse JSON | dev URL / shelf |
| Long task while typing | — | Performance trace | editor |
| Autosave poll interval | 1000ms | `packages/ui/src/editor/render-editor.ts` | quick |

## Ranked findings
1. [Critical|High|Medium|Low] …
```

## Testing strategy

| Level | What | Tool |
|--------|------|------|
| **Command contract** | Manual: run `/perf` on a sample diff; report includes scope banner + Quick/Deep mode | Human review |
| **Quick mode** | Static checks aligned with Janus (see checklist below) | Agent grep/read |
| **Deep mode** | Repro: dev server up, navigate surfaces, capture trace or Lighthouse | Chrome DevTools MCP / pasted JSON |
| **Regression guard (optional)** | Bundle size budget after `build:ui` | Future `scripts/perf/*` + CI |

### Quick mode checklist (Janus-specific)

Label every item **potential impact** unless backed by a trace or Lighthouse row.

1. **Editor typing** — input handlers on `textarea`/`contenteditable` must not do sync heavy work per keystroke; autosave must be debounced (`editor/autosave`).
2. **Navigation** — shelf → editor → back must not leak listeners or duplicate intervals (dispose autosave on leave).
3. **Bridge chatter** — avoid awaiting IPC on every input event; batch or debounce saves (already domain pattern for manuscript).
4. **Bundle** — accidental imports of large deps or entire locale JSON trees into critical path.
5. **i18n** — language packs loaded once per locale change, not per render (when `languages` UI is in scope).
6. **DOM** — full `innerHTML` rebuilds on each autosave status tick; unbounded `querySelectorAll` in hot paths.
7. **Mobile entry** — separate `mobile.html` / `@janus/mobile-entry` should not pull desktop-only weight without reason.

### Deep mode surfaces

| Surface | How to reach (dev) | What to measure |
|---------|-------------------|-----------------|
| Shelf | Default route after mount | LCP, list render with N books |
| Editor | Open a book from shelf | INP/long tasks while typing; save flush on back |
| Settings | Open settings from shell UI | Locale switch re-render cost |

Document exact selectors or routes in `reference.md` when implementing the command.

## Boundaries

- **Always:** State **Quick vs Deep** and **dev vs prod-like**. Restrict default scope to `packages/ui`. Respect `AGENTS.md` — no business logic in renderers; perf fixes belong in owning modules if the bottleneck is rule resolution, not DOM.
- **Ask first:** Adding npm dependencies (bundle visualizer, `web-vitals`), CI bundle gates, changing Vite `manualChunks`, or auditing `apps/desktop` main/preload for micro-optimizations.
- **Never:** Treat Lighthouse on `localhost` as user-facing SLA; use CrUX/PSI as if Janus were a public website; optimize `services/*` cold paths under the guise of “web perf” without measurement; block ship on mobile Instruments in v1.

## Success criteria

**Phase 1 — Command + skill (this spec)**

- [x] `docs/specs/SPEC-perf-command.md` approved.
- [x] `.cursor/commands/perf.md` exists and references this spec, dev URL, surfaces, and scope exclusions.
- [x] `.cursor/commands/webperf.md` deprecated or aliased to `/perf`.
- [x] `.cursor/skills/janus-performance-audit/SKILL.md` with scorecard template and checklist.
- [x] A trial run on current `packages/ui` produces a report with scope banner and at least one Janus-relevant quick finding or deep metric (see `.cursor/skills/janus-performance-audit/trial-quick-2026-10-18.md`).

**Phase 2 — Automation (optional, separate plan)**

- [ ] `scripts/perf/bundle-budget.ts` (or similar) with documented thresholds.
- [ ] CI job runs bundle budget on PRs touching `packages/ui`.

## Relationship to `/review`

`/review` axis 5 already points at `performance-optimization` for **code review**. `/perf` is a **dedicated audit** with measurement artifacts and Janus scoping — use `/perf` before large UI changes or when the user asks for a performance report; use `/review` for general PR review.

## Resolved decisions (2026-10-18)

Recorded in `tasks/plan.md` and implemented in Phase 1:

| Topic | Decision |
|--------|----------|
| Command name | **`/perf`** canonical; **`/webperf`** is a short alias |
| Budgets | Report `dist/ui` sizes when built; **no enforced caps** in v1 |
| Phase 2 CI | Bundle budget **on demand** only (separate plan) |
| Deep target | **Dev URL** sufficient for v1; Electron `file://` optional later |

---

**Phase 1 implementation:** `tasks/archive/perf-command-phase-1/` (completed 2026-10-18).
