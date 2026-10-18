# Implementation Plan: desktop-release (macOS GitHub CI)

**Status:** Implemented 2026-10-18 (local package + CI config). First `v*` tag push pending maintainer. Tasks: `tasks/todo.md` (archived copy below).

**Source specs:**

- `docs/specs/SPEC-desktop-release.md` (module — CI, packaging, Release assets)
- `docs/specs/SPEC-desktop-release-command.md` (`/release` verify workflow)

**Archived:** `tasks/archive/ship-gate-fixes/` (previous root plan).

## Overview

Ship **tag-triggered macOS Electron builds** on GitHub: maintainer pushes `v*`, Actions runs tests + UI/desktop build, **electron-builder** produces installable artifacts, **GitHub Release** hosts the download. Local **`bun run desktop:package`** mirrors CI. **`/release`** command + skill run the same verification gates before tagging.

No Windows, iOS, signing/notarization, or auto-update in this initiative.

## Plan decisions (open spec questions resolved for build)

| Topic | Decision |
|--------|----------|
| Artifacts | **`.zip`** required (drag `Janus.app`); **`.dmg`** if electron-builder produces it with no extra cost — not a blocker |
| Architecture | **arm64** only (`macos-latest`); document “Apple Silicon Mac” in install docs |
| Version | **Tag is source of truth** (`v0.1.0` → `0.1.0`); CI **fails** if `apps/desktop/package.json` `version` does not match |
| Release notes | **Auto-generated** body via `softprops/action-gh-release` (or `gh release create --generate-notes`) |
| Signing | **Out of scope** — unsigned + Gatekeeper copy in docs; phase 2 = spec amendment |

Bump `apps/desktop` `version` from `0.0.0` to first real tag (e.g. `0.1.0`) in Task 2.

## Current baseline

- No `.github/workflows/` yet.
- Desktop: `bun build` main/preload with `electron` external; workspace deps `@janus/*` resolve to **`.ts` exports** — packaged app must **bundle** main (or ship compiled workspace output); plan assumes **bun build inlines workspace imports** into `apps/desktop/dist/main.js` and builder packs `dist/` + `extraResources` for `dist/ui`.
- UI path today: `main.ts` → `../../../dist/ui` (monorepo dev/prod-from-source only).

## Architecture decisions

1. **Packaged UI path** — Extract pure `resolveUiBundleDir({ isPackaged, resourcesPath, devDistDir })` (testable without launching Electron); packaged → `path.join(resourcesPath, "ui")`; dev → existing repo `dist/ui` relative to built main.
2. **electron-builder** — Pinned devDependency on `@janus/desktop` (or root); `productName` **Janus**; `appId` e.g. `com.janus.writer` (stable); `mac.target`: `zip` (+ `dmg` default if enabled); `extraResources`: copy repo `dist/ui` → `resources/ui`.
3. **Production entry** — Packaged app must not set `JANUS_DEV`; `electron-builder` `files` include `dist/main.js`, `dist/preload.js`, `package.json`, and runtime deps as needed (avoid shipping whole monorepo).
4. **CI workflow** — Single job `release-macos` on `push.tags: v*`; permissions `contents: write`; steps: checkout → setup Bun → frozen install → test → build:ui → desktop build → package → upload to Release (no partial upload on failure).
5. **Verify script** — `scripts/validate-desktop-release.ts` asserts `Janus.app/Contents/Resources/ui/index.html` after local package; optional arg: path to `.app`.
6. **Agent workflow** — Mirror `perf` split: `.cursor/commands/release.md` + `.cursor/skills/janus-desktop-release/` per command spec (report shape already in spec).

## Dependency graph

```
resolveUiBundleDir + tests
    └── main.ts wired
            └── electron-builder config + extraResources(ui)
                    ├── bun run desktop:package (local vertical slice)
                    │       └── validate-desktop-release.ts
                    └── .github/workflows/desktop-release.yml
                            └── docs/install-macos.md (Release section)
                                    └── /release command + skill
```

## Task list (summary)

| # | Title | Delivers |
|---|--------|----------|
| 1 | Packaged UI path | Testable resolver + `main.ts`; dev/prod unchanged |
| 2 | Local macOS package | electron-builder, version bump, `desktop:package`, openable `.app` |
| 3 | Validate packaged bundle | `validate-desktop-release.ts` + root script hook |
| 4 | GitHub Actions release | `desktop-release.yml` on `v*` only |
| 5 | Install documentation | Release download + unsigned macOS steps |
| 6 | `/release` command + skill | Verify/setup/cut/remote modes |
| 7 | Spec approval + first tag checklist | Mark specs approved; manual CI sign-off task |

Details: archived `todo.md` in this folder.

## Checkpoints

### After Task 1

- [x] `bun run test` && `bun run desktop:prod` still works from repo root
- [x] New unit tests for packaged vs dev UI paths

### After Tasks 2–3 (local release path)

- [x] `bun run desktop:package` produces `Janus.app`
- [x] `bun run validate:desktop-release` (or documented name) passes
- [x] Manual: open packaged app — shelf visible, `data-platform="desktop"`

### After Task 4

- [x] Workflow YAML reviewed: tags `v*` only, `macos-latest`, no secrets
- [x] Optional dry-run: `act` not required; first real tag is acceptance

### After Tasks 5–7 (module done)

- [x] Install doc complete
- [x] `/release verify` documented path matches CI
- [ ] First `v0.1.0` push: Release asset downloadable (manual maintainer)

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bun build does not bundle `@janus/*` `.ts` for runtime in asar | High — app crashes on launch | Task 2: verify packaged main has no bare `workspace:` imports; add bundle step or compile services if needed |
| `dist/ui` path wrong inside `.app` | High — blank window | Task 1 + validate script; CI bundle assert step |
| electron-builder + Bun lockfile friction | Med | Pin builder version; CI uses same commands as local package |
| Unsigned Gatekeeper blocks users | Med | Document right-click Open / `xattr` in Task 5 |
| Tag/version drift | Low | CI version check in Task 4 |

## Parallelization

Sequential **1 → 2 → 3 → 4** (CI depends on local package). **Tasks 5 and 6** can parallelize after Task 3. **Task 7** last.

## Out of scope (explicit)

- Windows/Linux CI, Capacitor, `electron-updater`, notarization, `workflow_dispatch`, PR builds.
