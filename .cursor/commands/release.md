---
description: macOS desktop GitHub Release — setup, local verify, optional remote check after tag
---

> **Cursor:** Read skills at `.cursor/skills/<name>/SKILL.md`. Module spec: `docs/specs/SPEC-desktop-release.md`. Command spec: `docs/specs/SPEC-desktop-release-command.md`. Constraints: `AGENTS.md`.

`/release` is for **tag-triggered macOS Electron builds** and GitHub Release assets. Not Windows, not Capacitor/iOS, not auto-update.

Read and follow `.cursor/skills/janus-desktop-release/SKILL.md` (and `reference.md` for checklists and paths).

## Determine the mode

| User intent | Mode |
|-------------|------|
| `/release`, `/release verify`, or “check release pipeline” | **Verify** (default) |
| “set up CI”, “add electron-builder”, missing workflow | **Setup** — implement per `SPEC-desktop-release.md`, then run Verify |
| `/release cut v0.1.0` or “tag v0.1.0” | **Cut** — Verify first; print tag/push commands only; push/tag **only** if the user explicitly asks in this turn |
| `/release remote v0.1.0` or “did CI publish?” | **Remote** — `gh` workflow/run/release checks (skip with reason if `gh` unavailable) |

If the user is on **non-macOS**, run preflight (`test`, `validate:install`, workflow YAML review) and state that **package smoke** must run on a Mac or in CI.

## Run the workflow

Do **not** spawn a separate subagent unless the user asks for a parallel review.

1. State **mode**, **platform** (darwin vs other), and **spec** sections in scope.
2. **Setup:** use `ci-cd-and-automation`, `incremental-implementation`, and `SPEC-desktop-release.md`; one vertical slice at a time; re-run Verify when done.
3. **Verify:** execute the gates in the skill (preflight → build parity → package layout → workflow trigger audit).
4. **Cut:** require Verify pass (or list blockers); output exact git commands; warn on unsigned Gatekeeper install steps (`docs/install-macos.md`).
5. **Remote:** confirm workflow name, latest run conclusion, and Release asset filenames for the tag.

## Output

Return the full report from `janus-desktop-release/SKILL.md` (status **PASS** | **FAIL** | **PARTIAL**). No merge step.
