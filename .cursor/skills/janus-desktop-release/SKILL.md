---
name: janus-desktop-release
description: Implements and verifies Janus macOS desktop GitHub Releases for /release. Use for electron-builder packaging, desktop-release.yml, validate-desktop-release, and pre-tag verification — not Windows, mobile, or auto-update.
---

# Janus desktop release

## Overview

Janus ships a **macOS arm64** Electron app via **GitHub Releases** when a maintainer pushes a `v*` tag. `/release` runs the same gates as CI before tagging.

Read this skill when executing `.cursor/commands/release.md`. Also load:

- `docs/specs/SPEC-desktop-release.md` — module scope and success criteria
- `docs/specs/SPEC-desktop-release-command.md` — modes and report shape
- `reference.md` in this folder — paths, commands, checklist
- `.cursor/skills/ci-cd-and-automation/SKILL.md` — when editing workflows

## When to use

- Before pushing `v*` to GitHub
- After changing `apps/desktop`, `dist/ui` packaging, or `.github/workflows/desktop-release.yml`
- When setting up `bun run desktop:package` for the first time

**When NOT to use:** Capacitor/iOS, Windows/Linux CI, code signing/notarization (ask first), in-app auto-update.

## Modes

### Verify (default)

Run in order (skip package steps on non-macOS with **PARTIAL**):

1. `bun install --frozen-lockfile`
2. `bun run test`
3. `bun run validate:install`
4. `bun run build:ui` && `bun run --filter @janus/desktop build`
5. `bun run desktop:package` (macOS only)
6. `bun run validate:desktop-release`
7. Audit `.github/workflows/desktop-release.yml`: `on.push.tags` = `v*` only, `macos-latest`, version check step, release upload

Optional smoke: open `apps/desktop/release/mac-arm64/Janus.app` and confirm shelf UI.

### Setup

Implement missing pieces from `SPEC-desktop-release.md`, then run **Verify**.

### Cut

Verify first. If PASS, print:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Ensure `apps/desktop/package.json` `version` matches the tag (without `v`). **Do not** run git commands unless the user explicitly requests.

### Remote

After tag push (with `gh`):

```bash
gh run list --workflow=desktop-release.yml --limit 5
gh release view vX.Y.Z
```

Expect zip + dmg arm64 assets.

## Required report shape

```markdown
## Desktop release report

**Status:** PASS | FAIL | PARTIAL
**Mode:** Setup | Verify | Cut | Remote
**Platform:** darwin | other (…)

### Gates
| Gate | Result | Notes |
|------|--------|-------|
| frozen install | … | |
| bun run test | … | |
| validate:install | … | |
| build + package | … | |
| validate:desktop-release | … | |
| workflow v* only | … | |
| gh release / CI | … | |

### Blockers
- …

### Next steps
- …
```

## Exclusions

- Windows/Linux artifacts
- iOS / Capacitor archive
- Notarization and Developer ID (v1 unsigned)
- Pushing tags without explicit user consent
