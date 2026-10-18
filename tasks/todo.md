# Tasks: desktop-release (macOS GitHub CI)

**Plan:** `tasks/plan.md`  
**Specs:** `docs/specs/SPEC-desktop-release.md`, `docs/specs/SPEC-desktop-release-command.md`  
**Archived:** `tasks/archive/ship-gate-fixes/`

---

## Task 1: Packaged UI bundle path

**Description:** Extract a pure resolver for where `index.html` lives in dev vs packaged builds; wire `apps/desktop/src/main.ts` to use it when `app.isPackaged`.

**Acceptance criteria:**

- [x] `resolveUiBundleDir` (or equivalent) is unit-tested for `isPackaged: true` → `…/Resources/ui` layout matching electron-builder `extraResources`
- [x] `isPackaged: false` preserves current monorepo `dist/ui` behavior
- [x] `bun run test` and `bun run lint` pass
- [x] `bun run desktop:prod` still opens shelf UI from repo `dist/ui`

**Verification:**

- [ ] `bun run test`
- [ ] `bun run desktop:prod` — manual smoke

**Dependencies:** None

**Files likely touched:**

- `apps/desktop/src/main.ts`
- `apps/desktop/src/ui-bundle-dir.ts` (new)
- `apps/desktop/src/ui-bundle-dir.test.ts` (new)

**Estimated scope:** Small

---

## Task 2: electron-builder + local `desktop:package`

**Description:** Add pinned electron-builder, mac zip (and dmg if default), copy `dist/ui` into app resources, bundle main process for production, bump `apps/desktop` version to match first release (e.g. `0.1.0`), add root script `desktop:package`.

**Acceptance criteria:**

- [ ] `bun run build:ui` && `bun run --filter @janus/desktop build` && `bun run desktop:package` succeeds on macOS
- [ ] Output includes `Janus.app` with `Contents/Resources/ui/index.html`
- [ ] Packaged app launches without `JANUS_DEV` and shows Janus shelf (`data-platform="desktop"`)
- [ ] `bun run dev:desktop` unchanged
- [ ] `productName` / `appId` documented in builder config

**Verification:**

- [ ] `bun run test`
- [ ] `bun run desktop:package` then open `.app` manually

**Dependencies:** Task 1

**Files likely touched:**

- `apps/desktop/package.json`
- `package.json` (root `desktop:package`)
- `bun.lock`
- optional `apps/desktop/electron-builder.yml`

**Estimated scope:** Medium

---

## Checkpoint: Local package (after Tasks 1–2)

- [ ] Packaged app shelf smoke passes
- [ ] `bun run test` && `bun run lint`

---

## Task 3: `validate-desktop-release` script

**Description:** Add `scripts/validate-desktop-release.ts` that fails if packaged UI is missing; wire `bun run validate:desktop-release` (runs after `desktop:package` or accepts `.app` path).

**Acceptance criteria:**

- [ ] Script exits 0 when `Resources/ui/index.html` exists
- [ ] Script exits non-zero with clear message when missing
- [ ] Documented in command spec checklist / skill `reference.md` (Task 6)

**Verification:**

- [ ] `bun run desktop:package && bun run validate:desktop-release`

**Dependencies:** Task 2

**Files likely touched:**

- `scripts/validate-desktop-release.ts`
- `package.json`

**Estimated scope:** Small

---

## Task 4: GitHub Actions `desktop-release.yml`

**Description:** Tag-only workflow (`v*`), `macos-latest`, frozen bun install, test, build:ui, desktop build, package, version check vs tag, publish GitHub Release with zip (and dmg if built).

**Acceptance criteria:**

- [ ] Workflow triggers **only** on `push.tags: v*`
- [ ] Steps match local: install, test, build:ui, desktop build, package
- [ ] Fails if `apps/desktop/package.json` version ≠ tag (without `v`)
- [ ] Uploads Release assets on success; `contents: write` permission set
- [ ] No signing secrets; no Windows/mobile jobs
- [ ] Optional CI step: bundle assert (same as validate script)

**Verification:**

- [ ] Review YAML locally
- [ ] Manual: push tag after merge (Task 7)

**Dependencies:** Tasks 2–3

**Files likely touched:**

- `.github/workflows/desktop-release.yml`

**Estimated scope:** Medium

---

## Checkpoint: CI config (after Task 4)

- [ ] Workflow file matches `SPEC-desktop-release.md` trigger and gates
- [ ] `bun run test` && `bun run validate:install` still pass on dev machine

---

## Task 5: Install docs — GitHub Release

**Description:** Add “Install from GitHub Release” to `docs/install-macos.md`: download zip, unsigned Gatekeeper, arm64 note, library location (production desktop).

**Acceptance criteria:**

- [ ] Section covers download, unzip, first launch, optional `xattr -cr`
- [ ] States Apple Silicon (arm64) for v1
- [ ] Links to Releases page pattern (`/releases/tag/v…`)

**Verification:**

- [ ] Doc review

**Dependencies:** Task 2 (artifact names known)

**Files likely touched:**

- `docs/install-macos.md`

**Estimated scope:** Small

---

## Task 6: `/release` command + `janus-desktop-release` skill

**Description:** Implement agent workflow per `SPEC-desktop-release-command.md`: command modes, skill + reference with verify checklist and report shape.

**Acceptance criteria:**

- [ ] `.cursor/commands/release.md` matches command spec modes table
- [ ] `.cursor/skills/janus-desktop-release/SKILL.md` + `reference.md` (paths, gates, `gh` optional)
- [ ] Verify mode lists: frozen install, test, validate:install, package, validate-desktop-release, workflow audit

**Verification:**

- [ ] Read command + skill; run Verify gates manually once

**Dependencies:** Tasks 3–4 (script + workflow exist)

**Files likely touched:**

- `.cursor/commands/release.md`
- `.cursor/skills/janus-desktop-release/SKILL.md`
- `.cursor/skills/janus-desktop-release/reference.md`

**Estimated scope:** Small

---

## Task 7: Approve specs + first release sign-off

**Description:** Mark `SPEC-desktop-release.md` and `SPEC-desktop-release-command.md` **approved**; run `/release verify` before first tag; maintainer pushes `v0.1.0` (or chosen version) and confirms Release asset.

**Acceptance criteria:**

- [ ] Both specs status → approved with date
- [ ] `/release verify` report PASS on maintainer Mac
- [ ] GitHub Release for first tag contains macOS zip (and dmg if applicable)
- [ ] Downloaded artifact installs and runs shelf smoke

**Verification:**

- [ ] `gh release view <tag>` or Releases UI
- [ ] Manual install from downloaded asset

**Dependencies:** Tasks 4–6

**Files likely touched:**

- `docs/specs/SPEC-desktop-release.md`
- `docs/specs/SPEC-desktop-release-command.md`

**Estimated scope:** Small (mostly manual)

---

## Checkpoint: Module complete (after Task 7)

- [ ] All tasks 1–7 acceptance criteria checked
- [ ] `bun run test` && `bun run lint` && `bun run validate:install`
- [ ] CAPABILITY-MAP desktop-release line updated if needed (shipped note)
