# Tasks: desktop-release (macOS GitHub CI)

**Plan:** `tasks/plan.md`  
**Specs:** `docs/specs/SPEC-desktop-release.md`, `docs/specs/SPEC-desktop-release-command.md`  
**Archived:** `tasks/archive/ship-gate-fixes/`  
**Status:** Complete (2026-10-18). First tag push is manual maintainer step.

---

## Task 1: Packaged UI bundle path

**Acceptance criteria:**

- [x] `resolveUiBundleDir` (or equivalent) is unit-tested for `isPackaged: true` → `…/Resources/ui` layout matching electron-builder `extraResources`
- [x] `isPackaged: false` preserves current monorepo `dist/ui` behavior
- [x] `bun run test` and `bun run lint` pass
- [x] `bun run desktop:prod` still opens shelf UI from repo `dist/ui`

---

## Task 2: electron-builder + local `desktop:package`

**Acceptance criteria:**

- [x] `bun run build:ui` && `bun run --filter @janus/desktop build` && `bun run desktop:package` succeeds on macOS
- [x] Output includes `Janus.app` with `Contents/Resources/ui/index.html`
- [x] Packaged app launches without `JANUS_DEV` and shows Janus shelf (`data-platform="desktop"`)
- [x] `bun run dev:desktop` unchanged
- [x] `productName` / `appId` documented in builder config

---

## Checkpoint: Local package (after Tasks 1–2)

- [x] Packaged app shelf smoke passes
- [x] `bun run test` && `bun run lint`

---

## Task 3: `validate-desktop-release` script

**Acceptance criteria:**

- [x] Script exits 0 when `Resources/ui/index.html` exists
- [x] Script exits non-zero with clear message when missing
- [x] Documented in command spec checklist / skill `reference.md` (Task 6)

---

## Task 4: GitHub Actions `desktop-release.yml`

**Acceptance criteria:**

- [x] Workflow triggers **only** on `push.tags: v*`
- [x] Steps match local: install, test, build:ui, desktop build, package
- [x] Fails if `apps/desktop/package.json` version ≠ tag (without `v`)
- [x] Uploads Release assets on success; `contents: write` permission set
- [x] No signing secrets; no Windows/mobile jobs
- [x] Optional CI step: bundle assert (same as validate script)

---

## Checkpoint: CI config (after Task 4)

- [x] Workflow file matches `SPEC-desktop-release.md` trigger and gates
- [x] `bun run test` && `bun run validate:install` still pass on dev machine

---

## Task 5: Install docs — GitHub Release

**Acceptance criteria:**

- [x] Section covers download, unzip, first launch, optional `xattr -cr`
- [x] States Apple Silicon (arm64) for v1
- [x] Links to Releases page pattern (`/releases/tag/v…`)

---

## Task 6: `/release` command + `janus-desktop-release` skill

**Acceptance criteria:**

- [x] `.cursor/commands/release.md` matches command spec modes table
- [x] `.cursor/skills/janus-desktop-release/SKILL.md` + `reference.md` (paths, gates, `gh` optional)
- [x] Verify mode lists: frozen install, test, validate:install, package, validate-desktop-release, workflow audit

---

## Task 7: Approve specs + first release sign-off

**Acceptance criteria:**

- [x] Both specs status → approved with date
- [x] `/release verify` report PASS on maintainer Mac (validate-desktop-release + package)
- [ ] GitHub Release for first tag contains macOS zip (and dmg if applicable) — **push `v0.1.0` after merge**
- [ ] Downloaded artifact installs and runs shelf smoke — **manual after CI**

---

## Checkpoint: Module complete (after Task 7)

- [x] Tasks 1–6 acceptance criteria checked
- [x] `bun run test` && `bun run lint` && `bun run validate:install`
- [x] CAPABILITY-MAP desktop-release line updated
