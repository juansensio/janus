# Spec: desktop-release

> Status: **approved** (2026-10-18). **GitHub Actions macOS desktop artifacts on git tag.** Depends on shipped **shell** and current desktop feature set. Does **not** include Windows, Linux, Capacitor/iOS, or in-app auto-update.  
> **Agent workflow (spec only):** [`SPEC-desktop-release-command.md`](SPEC-desktop-release-command.md) defines future `/release` command + `janus-desktop-release` skill to implement, verify locally, and optionally confirm CI/Release after a tag — not created until post-approval implementation.

Indexed from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). This is **delivery infrastructure** for `apps/desktop`; it does not add product features.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. The repository is hosted on **GitHub** and releases use **GitHub Releases** (assets attached to the tag).
2. **Trigger is tag push only** — not every push to `main`, not pull requests, not `workflow_dispatch` in v1.
3. Tag pattern **`v*`** (e.g. `v0.1.0`). Release version is derived from the tag (strip leading `v`) and must match `apps/desktop` (or root) `package.json` version after implementation chooses a single source of truth.
4. **macOS only** — one job on `macos-latest`. No Windows or mobile CI in this module.
5. **Unsigned / not notarized in v1** — artifacts install with normal Gatekeeper friction (Open anyway, or documented `xattr`). Apple Developer ID signing and notarization are a follow-up slice (secrets + “ask first” in shell).
6. **Production desktop** — packaged app runs without `JANUS_DEV=1` (library root follows production rules in `SPEC-library-root.md`).
7. **Bun** remains the install and script runner in CI (`bun install --frozen-lockfile`), consistent with `SPEC-shell.md`.
8. Packaged UI loads from **`dist/ui`** shipped inside the app bundle (not the Vite dev server).
→ Correct me now or approve and we proceed with these.
```

## Objective

Writers and collaborators who do **not** want to clone and run Bun locally can **download a macOS build from GitHub** after a maintainer pushes a version tag.

### User stories

- As a maintainer, I push tag `v0.1.0` and GitHub Actions produces a macOS installable artifact and attaches it to the **Release** for that tag.
- As a user on macOS, I open the repo’s **Releases** page, download the asset for my tag, install or unzip, and open **Janus** with the same shelf/editor behavior as `bun run desktop:prod` on a clean machine (library under default production paths unless they choose a folder in Settings).

### Acceptance criteria

**Trigger and scope**

- Workflow runs **only** on `push` of tags matching `v*` (document exact pattern in workflow comments).
- Single job on **`macos-latest`**. No matrix for other OSes; no Capacitor sync or Xcode archive steps.

**Quality gate (before packaging)**

- `bun install --frozen-lockfile` at repo root.
- `bun run test` passes.
- `bun run build:ui` produces `dist/ui` with `index.html` and `assets/` (same expectations as `scripts/validate-install.ts` for desktop entry; mobile.html may be built but is not shipped to end users in this slice).
- Desktop main/preload build succeeds (`bun run --filter @janus/desktop build` or equivalent root script added during implementation).

**Packaging**

- Output is a **standard macOS distributable** attached to the GitHub Release:
  - **Minimum:** `.zip` containing `Janus.app` (or agreed product name) suitable for drag-to-Applications.
  - **Target:** `.dmg` with the app inside (optional in v1 if zip ships first; spec success criteria require at least one format users can install without Bun).
- App **icon and bundle id** are stable across releases (chosen once; document in `apps/desktop` or packager config).
- Packaged app resolves the UI bundle path correctly when `app.isPackaged` (no reliance on monorepo `../../../dist/ui` from source tree).

**Release publication**

- GitHub Release is created (or updated) for the tag with a human-readable title/body (tag name + optional generated notes listing commit range).
- Built artifacts are uploaded as **Release assets** (not only short-lived Actions artifacts).
- Failed build does **not** publish partial or broken assets.

**Documentation**

- `docs/install-macos.md` (or a short `docs/install-desktop-release.md`) adds a **“Install from GitHub Release”** section: download, quarantine/Gatekeeper note for unsigned builds, first launch, library location (production desktop rules).

**Regression**

- Local dev unchanged: `bun run dev:desktop`, `bun run desktop:prod`, and `bun run validate:install` still work on a developer Mac.
- No secrets committed; signing credentials only via GitHub Actions secrets in a later slice.

## Tech Stack

| Piece | Choice | Notes |
|--------|--------|--------|
| CI | **GitHub Actions** | `.github/workflows/` |
| Runner | `macos-latest` | Apple Silicon + Intel support via universal or arch-specific build (pick one in implementation; document in plan) |
| Runtime | **Bun** (pinned via `bun.lock`) | `oven-sh/setup-bun` or documented equivalent |
| Desktop | **Electron** 33.x (pinned in `apps/desktop`) | Same major as local dev |
| Packager | **electron-builder** (pinned devDependency) | Alternative: Electron Forge only if builder cannot bundle workspace layout; default preference is builder for Release asset ergonomics |
| UI | Vite build → `dist/ui` | `bun run build:ui` before pack |

**Explicitly out of scope:** Windows/Linux artifacts, TestFlight/App Store, `electron-updater`, crash reporting, nightly builds, PR preview builds.

## Commands

Local (unchanged baseline; release script may be added):

```
Install:           bun install
Test:              bun run test
Build UI:          bun run build:ui
Build desktop:     bun run --filter @janus/desktop build
Prod-like run:     bun run desktop:prod
Validate journey:  bun run validate:install
```

Release (maintainer — after implementation):

```
git tag v0.1.0
git push origin v0.1.0
# CI runs on tag push; assets appear on GitHub Releases for v0.1.0
```

Optional local parity (implementation may add):

```
Package mac:       bun run desktop:package   # or documented electron-builder CLI from repo root
```

CI (conceptual — exact YAML in implementation):

```
bun install --frozen-lockfile
bun run test
bun run build:ui
bun run --filter @janus/desktop build
# electron-builder --mac (with config pointing at built main, preload, dist/ui)
```

## Project Structure

```
.github/workflows/
  desktop-release.yml     → tag-triggered macOS build + GitHub Release upload

apps/desktop/
  package.json            → version field, build scripts, electron-builder config or pointer
  electron-builder.yml    → optional; or "build" block in package.json
  src/main.ts             → packaged UI path via app.isPackaged + resourcesPath (if not already)

dist/ui/                  → build output (gitignored); copied into app resources in CI

docs/
  install-macos.md        → link Release install path (or sibling doc)

scripts/
  validate-install.ts          → existing journey gate
  validate-desktop-release.ts  → optional; asserts from SPEC-desktop-release-command.md

.cursor/                       → **implementation phase only** (see SPEC-desktop-release-command.md)
  commands/release.md
  skills/janus-desktop-release/
```

No new `services/*` domain modules. Packaging logic stays in **shell / desktop app** and **CI config**.

## Code Style

Follow `SPEC-shell.md` and `AGENTS.md`: TypeScript in main/preload, no domain rules in workflow YAML beyond orchestration.

**Packaged UI path (illustrative — implementation must match electron-builder layout):**

```ts
import path from "node:path";
import { app } from "electron";

function uiBundleDir(): string {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, "ui");
    }
    return path.resolve(__dirname, "../../../dist/ui");
}
```

Workflow files: kebab-case name, comments for tag pattern and required secrets (none in v1 unsigned).

## Testing Strategy

| Level | What | Where |
|--------|------|--------|
| Unit | Unchanged; no business logic in workflows | existing Vitest |
| Path resolution | `uiBundleDir` / load target for packaged vs dev | colocated test in `apps/desktop` (pure function extracted if needed) |
| CI gate | `bun run test` on tag workflow | GitHub Actions |
| Build gate | UI + desktop build on tag workflow | GitHub Actions |
| Package smoke (CI) | Optional v1: launch packaged `.app` headlessly or verify bundle contains `Resources/ui/index.html` | macOS job script; required before calling module done if cheap |
| Manual sign-off | Maintainer downloads Release asset on a clean Mac, opens app, confirms `#app` / shelf | documented in install journey |

Coverage: no new global coverage gate. Release workflow must fail loudly on any step error.

## Boundaries

- **Always:** Pin packager and Electron versions; use `--frozen-lockfile` in CI; run `bun run test` before packaging; attach artifacts only to the matching tag Release; keep Windows/mobile out of this workflow; document unsigned install steps for users.
- **Ask first:** Apple/Microsoft code signing and notarization; adding `workflow_dispatch` or building on every `main` push; new root dependencies beyond electron-builder (and its tree); changing Electron major version; auto-update; publishing to Homebrew or third-party stores; building mobile in the same workflow.
- **Never:** Commit certificates, `.p12`, or API keys; disable tests to green a release; ship `JANUS_DEV=1` in packaged builds; upload `node_modules` or full git clone as the release asset; block library/manuscript features in domain modules with release-only hacks.

## Success Criteria

Module is **done** when all of the following hold:

1. Pushing `v0.1.0` (or next agreed tag) runs exactly one macOS workflow and completes successfully.
2. The GitHub Release for that tag includes at least one macOS asset a user can install without Bun.
3. Installed app opens, shows the Janus shelf UI, and can create/open a book with autosave under production library rules.
4. `docs/install-macos.md` (or linked doc) describes Release install and unsigned macOS caveats.
5. `bun run test` and `bun run validate:install` pass on a dev machine after the change.
6. `CAPABILITY-MAP.md` indexes this spec (done when spec is approved).
7. `SPEC-desktop-release-command.md` is approved; `/release` command and skill are implemented in the same initiative (or immediately before first tag).

## Release status (living)

**User-facing summary:** [`docs/desktop-release-status.md`](../desktop-release-status.md) — shipped tags, Gatekeeper behavior, and what is required for open-without-Security-settings (notarization phase 2).

## Open Questions

1. **Notarization phase 2:** separate spec amendment vs extend this spec — pending Apple Developer credentials in CI.

## Resolved decisions

| Topic | Decision |
|--------|----------|
| Trigger | Tag push `v*` only |
| Platforms | macOS CI only (arm64) |
| Mobile / Windows | Out of scope |
| Artifacts | zip + dmg |
| Version | Tag must match `apps/desktop/package.json` |
| Release notes | Auto-generated in CI |
| Signing v1 | Ad-hoc in CI; **not** notarized — Gatekeeper bypass documented |
| UI in package | `dist/ui` → `Resources/ui` |
| Release surface | GitHub Release assets |
| Production library | `~/Documents/Janus` (packaged); `.janus-library` dev-only |
