# Spec: Janus desktop release command (`/release`)

> Status: **draft** (2026-10-18) — spec phase only; **do not** add `.cursor/commands/release.md` or `.cursor/skills/janus-desktop-release/` until this spec is approved and implementation starts.  
> **Not a CAPABILITY-MAP module.** Agent/dev workflow (future command + skill). Product delivery rules live in [`SPEC-desktop-release.md`](SPEC-desktop-release.md).

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Maintainers use **GitHub** for hosting and **GitHub Releases** for downloadable macOS assets (per `SPEC-desktop-release.md`).
2. `/release` orchestrates **implement → verify locally → verify CI/release** — it does not replace human judgment on version numbers or signing.
3. Verification uses **repo scripts and shell checks** first; `gh` CLI when available for remote release status (optional, not required to pass local verify).
4. **macOS only** — agents on Linux can still edit workflow YAML and run `bun run test` / `build:ui`, but **package smoke** requires a Mac (or CI) and must be called out when skipped.
5. v1 matches unsigned desktop release spec: no secrets, no notarization steps in the command.
→ Correct me now or approve and we proceed with these.
```

## Objective

Provide **`/release`**, a Janus-scoped workflow so an agent (or maintainer) can:

1. **Implement or extend** desktop release plumbing per `SPEC-desktop-release.md` when artifacts are missing.
2. **Verify** the pipeline before tagging: tests, UI build, desktop build, packager output, bundle layout.
3. **Confirm** a tag-triggered GitHub Actions run and Release assets when the user has pushed a tag (via `gh` or user-provided URLs).

### User stories

- As a **maintainer**, I run `/release verify` before `git push origin v0.1.0` and get a pass/fail report with fix hints.
- As a **contributor**, I run `/release` after changing `apps/desktop` or CI and the agent runs the same gates CI will run.
- As a **reviewer**, I see a structured report proving `Janus.app` contains `Resources/ui/index.html` and that the workflow triggers only on `v*` tags.

### Acceptance criteria (command behavior)

- Invoking `/release` without arguments runs **Verify** mode (local preflight + package checks if packaging exists).
- Sub-intents (user may say explicitly):
  - **`/release setup`** — implement missing pieces from `SPEC-desktop-release.md` (workflow, electron-builder, packaged UI path, docs, root scripts).
  - **`/release verify`** — same as default; no tag push.
  - **`/release cut v0.1.0`** — verify first; if pass, print exact `git tag` / `git push` steps; **do not push or tag** unless the user explicitly asks in the same turn.
  - **`/release remote v0.1.0`** — after a tag push, check GitHub Actions + Release assets (`gh` when available).
- Report uses the **required shape** in § Required report shape below (copied into the skill at implementation time).
- Scope stays **desktop macOS GitHub Release** — no Windows, mobile, or auto-update unless user expands scope.

## Tech stack

| Piece | Choice |
|--------|--------|
| Agent entry | `.cursor/commands/release.md` |
| Skill | `.cursor/skills/janus-desktop-release/SKILL.md` + `reference.md` |
| Module spec | `docs/specs/SPEC-desktop-release.md` |
| CI | `.github/workflows/desktop-release.yml` (when implemented) |
| Local pack | `bun run desktop:package` or documented `electron-builder` invocation (when implemented) |

## Commands

**Preflight (always in Verify):**

```bash
bun install --frozen-lockfile
bun run test
bun run validate:install
```

**Release build parity (when packaging exists):**

```bash
bun run build:ui
bun run --filter @janus/desktop build
bun run desktop:package    # root script — implementation adds this
```

**Optional remote checks (maintainer Mac with `gh` auth):**

```bash
gh workflow list
gh run list --workflow=desktop-release.yml --limit 5
gh release view v0.1.0
```

**Tag cut (human or explicit user request only):**

```bash
git tag v0.1.0
git push origin v0.1.0
```

## Project structure

```text
.cursor/commands/release.md
.cursor/skills/janus-desktop-release/
  SKILL.md
  reference.md
docs/specs/SPEC-desktop-release-command.md   → this spec
docs/specs/SPEC-desktop-release.md           → product/CI module
scripts/validate-desktop-release.ts          → optional; implementation may add
```

## Code style

- Command markdown: short routing doc; heavy detail in the skill and module spec.
- Verification scripts: TypeScript under `scripts/`, exit non-zero on failure, no secrets.

## Testing strategy

| Check | Verify mode | CI |
|--------|-------------|-----|
| Unit tests | `bun run test` | same |
| UI artifacts | `validate:install` | `build:ui` + asserts |
| Packaged UI path | unit test in `apps/desktop` | — |
| `.app` bundle layout | `reference.md` shell asserts | optional job step |
| Workflow trigger | static review `on.push.tags` | tag push |

## Boundaries

- **Always:** Run Verify before recommending a tag push; cite `SPEC-desktop-release.md` for scope; fail the report on missing `Resources/ui/index.html` in a built `.app`.
- **Ask first:** Pushing tags, creating GitHub releases manually, adding signing secrets, `workflow_dispatch`, non-macOS targets.
- **Never:** Commit certificates; disable tests to green verify; push tags without user consent.

## Required report shape

The agent returns this structure every time (status is mandatory):

```markdown
## Desktop release report

**Status:** PASS | FAIL | PARTIAL  
**Mode:** Setup | Verify | Cut | Remote  
**Platform:** darwin | other (package smoke skipped: …)

### Gates
| Gate | Result | Notes |
|------|--------|-------|
| frozen install | pass/fail/skip | |
| bun run test | pass/fail | |
| validate:install | pass/fail | |
| build:ui + desktop build | pass/fail/skip | skip if not implemented |
| desktop:package | pass/fail/skip | |
| .app contains Resources/ui/index.html | pass/fail/skip | path in notes |
| workflow triggers v* only | pass/fail/skip | file:line |
| gh release / CI run | pass/fail/skip | tag if Remote |

### Blockers
- …

### Next steps
- …
```

**PARTIAL:** preflight passed on a non-Mac host but package smoke not run; or CI config reviewed but no local `.app` yet.

## Verify checklist (skill `reference.md` content at implementation)

1. **Preflight:** `bun install --frozen-lockfile`, `bun run test`, `bun run validate:install`.
2. **Build parity:** `bun run build:ui`, `bun run --filter @janus/desktop build`.
3. **Package:** `bun run desktop:package` (when added); locate `Janus.app` under packager output dir (document in module spec).
4. **Bundle assert:** `test -f "<Janus.app>/Contents/Resources/ui/index.html"` (exact layout must match electron-builder config).
5. **Smoke (macOS):** open packaged app; confirm `<main id="app">` and shelf visible (`data-platform="desktop"`); optional create book + autosave.
6. **Workflow audit:** `.github/workflows/desktop-release.yml` — `on.push.tags` matches `v*` only; job `runs-on: macos-latest`; steps mirror preflight + package + release upload.
7. **Remote (optional):** `gh run list --workflow=desktop-release.yml`; `gh release view <tag>` — assets include `.zip` and/or `.dmg`.

## Implementation phase (after spec approval)

Deliverables **not** part of spec-only work:

| Artifact | Purpose |
|----------|---------|
| `.cursor/commands/release.md` | Slash command routing (modes table) |
| `.cursor/skills/janus-desktop-release/SKILL.md` | Full workflow + link to this spec |
| `.cursor/skills/janus-desktop-release/reference.md` | Paths, env vars, checklist |
| `scripts/validate-desktop-release.ts` | Optional; non-zero exit if bundle asserts fail |

Command implementation should mirror `SPEC-perf-command.md` → `.cursor/commands/perf.md` + `janus-performance-audit` split.

## Success criteria (this spec)

- Human approves this document and `SPEC-desktop-release.md` together.
- A reader can implement command + skill without guessing modes, gates, or report shape.
- After **module** implementation, running Verify per this spec passes on a clean Mac before the first real tag.

## Success criteria (command artifacts — implementation)

- `.cursor/commands/release.md` and `janus-desktop-release` skill exist and match this spec.
- A maintainer can follow Verify output and know whether it is safe to push `v*`.

## Resolved decisions

| Topic | Decision |
|--------|----------|
| Command name | `/release` |
| Default mode | Verify |
| Remote checks | Optional via `gh` |
| Tag push | User must explicitly request |
