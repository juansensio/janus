# Spec: shell

> Status: **approved** (2026-10-18). Package manager: **Bun**.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Primary development machine is macOS with Xcode (iOS Simulator) and CocoaPods available.
2. **Bun** (current stable) installs dependencies and runs scripts; versions are pinned in `bun.lock`.
3. **Bun workspaces** at the repo root (`package.json` `workspaces` field). Use `npm`/`npx` only when a tool does not support Bun (document any exception in `docs/install-macos.md`).
4. Desktop ships as Electron; mobile companion ships as Capacitor (iOS first on Mac; Android is documented but not a shell gate).
5. Domain logic will live in TypeScript under `services/<domain>/` with no Electron, Capacitor, or DOM imports (per `AGENTS.md`).
6. Books remain plain files on disk later; the shell does not implement the library yet.
7. No Python/Flask stack — the earlier local-browser shell decision is withdrawn.
→ Correct me now or approve and we proceed with these.
```

## Objective

Janus is a **shared TypeScript core** inside **two native shells**: **Electron** on desktop and **Capacitor** on mobile. The shell module delivers:

1. A **Mac dev environment** where you can run the desktop app and open the iOS app in Simulator.
2. A **documented install journey** anyone can follow to prove the toolchain works on a fresh clone.
3. A **minimal UI** — one shared screen with `<main id="app">` and the name Janus — so later modules (languages, manuscript, …) mount into a known place.

The user is one writer on one machine. There are no accounts, no cloud requirement, and no domain features in this spec.

### Phased delivery (this module only)

| Phase | Outcome |
|--------|---------|
| **A — Toolchain** | Repo layout, workspaces, TypeScript, Electron main/preload, Capacitor iOS project, scripts to run each target on Mac. |
| **B — Install journey** | README (or `docs/install-macos.md`) walkthrough: clone → install → desktop window → iOS Simulator build, all passing scripted smoke checks where possible. |
| **C — Shell surface** | Shared `packages/ui` renders Janus in `#app` on desktop and in Simulator; bridge exposes only `platform()` for now. |

Feature modules (`languages`, `manuscript`, …) start **after** this spec is implemented and verified. They do not belong in Phase A–C.

### Acceptance criteria

- From a clean clone on macOS, documented commands install dependencies and run desktop dev without extra manual steps beyond Xcode/CocoaPods prerequisites.
- Electron opens a window whose document contains `<main id="app">` and visible text `Janus`.
- Capacitor iOS build runs in Simulator and shows the same mount point and text (same shared UI bundle).
- `services/` is not created by the shell; no domain rules in main process, preload, templates, or UI beyond the static title.
- A single **bridge interface** is defined in TypeScript; desktop and mobile each provide one implementation. Shell code does not fork business logic per platform.
- Automated tests cover the bridge contract and any pure TS in `packages/bridge` / `packages/ui` mount helper; Electron smoke can be a minimal scripted check (see Testing Strategy).

## Tech Stack

| Layer | Choice | Notes |
|--------|--------|--------|
| Language | **TypeScript** 5.x | Strict mode; ESM. |
| Package manager | **Bun** | Install, scripts, test runner entry; lockfile `bun.lock`. |
| Workspaces | **Bun workspaces** | Root `package.json` owns scripts and workspace list. |
| Desktop shell | **Electron** (pinned) | `main` + `preload`; context isolation on. |
| Mobile shell | **Capacitor** (pinned, major 6+) | iOS project under `apps/mobile/ios`; `webDir` points at built UI. |
| UI bundler | **Vite** (pinned) | Builds `packages/ui` to `apps/desktop/renderer` and `apps/mobile/www` (or one `dist/ui` consumed by both). |
| Core layout | `packages/*` + `apps/*` | See Project Structure. |
| Lint | **oxlint** or **eslint** (pick one at implement time; pin version) | Ask before adding the second linter. |
| Unit tests | **Vitest** (or `node --test` + **tsx**) | Pure TS only in shell tests. |

Pinned versions live in `bun.lock` and per-package `package.json` files. No unpinned `latest`. Commit `bun.lock`.

**Explicitly out of scope for shell:** Tauri, Flask, React/Vue/Svelte, database, Alembic, AI SDKs, manuscript file format.

## Commands

Prerequisites (documented in install journey): [Bun](https://bun.sh), Xcode + Command Line Tools, CocoaPods (`brew install cocoapods`), Apple Simulator runtime.

```
Install (root):     bun install
Install (CI):       bun install --frozen-lockfile
Build UI:           bun run build:ui
Dev desktop:        bun run dev:desktop
Dev mobile (sync):  bun run cap:sync:ios
Open Xcode:         bun run cap:open:ios
Test (unit):        bun run test
Lint:               bun run lint
Smoke (optional):   bun run test:smoke:desktop
Validate journey:   bun run validate:install
```

`validate:install` is a single script that runs unit tests, builds UI, and asserts build artifacts exist (and may launch Electron headlessly for a DOM check if CI-friendly). Full Simulator launch remains a **manual** gate in the install journey until CI macOS runners are configured.

Dev desktop should use Vite HMR against Electron where practical; mobile dev loop is `build:ui` → `cap sync ios` → Run in Xcode (documented).

## Project Structure

```
package.json                 → workspaces, root scripts
bun.lock                     → committed lockfile
tsconfig.base.json           → shared TS options
CAPABILITY-MAP.md            → module index (repo root)

packages/
  bridge/                    → JanusBridge type + platform-neutral helpers
  ui/                        → index.html shell, styles, mountJanusShell()
                             → no domain imports from services/

apps/
  desktop/
    package.json
    src/main.ts              → Electron main process
    src/preload.ts           → contextBridge exposes bridge
    electron.vite.config.*   → or vite config wiring
  mobile/
    package.json
    capacitor.config.ts
    ios/                     → generated/maintained Capacitor iOS project
    android/                 → optional scaffold; not required for shell sign-off
    src/native-bridge.ts     → Capacitor-side bridge impl (TS)

docs/
  specs/
    SPEC-<module-id>.md      → one module spec per capability map row
  install-macos.md           → install journey (Phase B)

services/                    → not created in shell (first domain module adds it)

tests/ or packages/*/tests   → unit tests colocated or under tests/
```

`AGENTS.md` separation: **presentation** in `packages/ui`, **routing/infra** in `apps/desktop` and `apps/mobile`, **domain** later in `services/<domain>/`.

## Code Style

Domain-free TypeScript. Four-space indent. Double quotes. Named exports. Bridge API is the only cross-layer contract.

**Bridge (packages/bridge):**

```ts
export type Platform = "desktop" | "mobile";

export interface JanusBridge {
  platform(): Platform;
}

export function createShellLabel(): string {
  return "Janus";
}
```

**UI mount (packages/ui):** only renders structure; no locale resolution, no file I/O.

```ts
export function mountJanusShell(root: HTMLElement, bridge: JanusBridge): void {
  root.replaceChildren();
  const heading = document.createElement("h1");
  heading.textContent = createShellLabel();
  root.append(heading);
  root.dataset.platform = bridge.platform();
}
```

Electron `preload` wires `window.janus` to an object implementing `JanusBridge`. Capacitor loads the same bundle and injects the mobile implementation before `mountJanusShell`.

## Testing Strategy

| Level | What | Tool |
|--------|------|------|
| Unit | `createShellLabel`, bridge typings, mount helper DOM | Vitest + jsdom (or happy-dom) |
| Desktop smoke | App starts, `#app` contains `Janus` | Playwright or Electron driver (optional in Phase B; required before calling shell done if cheap) |
| Mobile | Manual Simulator check per install journey | Documented screenshot/step |
| CI (later) | Unit + build artifacts | GitHub Actions; macOS job for Electron optional |

Coverage gate: none until the project sets one. Shell is done when unit tests and `validate:install` pass and the manual Simulator step in `docs/install-macos.md` succeeds.

## Boundaries

- **Always:** Run `bun run test` before treating shell work complete. Keep `services/` absent. Keep domain rules out of `apps/*` and `packages/ui`. Pin dependency versions. Commit `bun.lock`. Use the shared bridge interface for any host capability.
- **Ask first:** New top-level package, switching bundler, adding React, database, network listeners beyond dev HMR, Android as a gate, auto-update, code signing.
- **Never:** Commit `node_modules`, derived `dist/` (unless project policy says otherwise — default: gitignore dist), secrets, or platform-specific hacks in `packages/ui`. Import Flask/Electron from `services/`. Ship feature UI before that feature’s spec is approved.

## Success Criteria

**Phase A — Toolchain**

- `bun install` at repo root succeeds on macOS.
- `bun run dev:desktop` opens Electron with Janus visible in `#app`.
- `bun run cap:open:ios` opens Xcode; Run on an iPhone/iPad simulator shows the same UI.

**Phase B — Install journey**

- `docs/install-macos.md` lists prerequisites and every command in order; a new contributor can follow it without reading the spec.
- `bun run validate:install` passes locally (build + unit tests + artifact checks).

**Phase C — Ready for features**

- `packages/bridge` exports a stable `JanusBridge` used by both shells.
- `packages/ui` exports `mountJanusShell` and is the only place the shell markup for `#app` lives.
- Capability map modules after `shell` may proceed to Specify/Plan (`languages`, …).

## Resolved decisions

| Topic | Decision |
|--------|-----------|
| Package manager | **Bun** (workspaces + `bun run` for all root scripts). |
| Window API | `window.janus` |
| Android | Scaffold optional; **iOS Simulator is the mobile gate** for shell sign-off. |
| Build output | **Gitignore** `dist/` and generated `apps/mobile/www`; run `bun run build:ui` before `cap sync`. |

## Open Questions

None.

---

**Next step:** **Plan** (`tasks/plan.md`) — Task 1: Phase A (Mac dev env: Electron + Capacitor iOS Simulator), Task 2: Phase B (install journey + `validate:install`), Task 3: Phase C (shared UI + bridge). Feature implementation waits until those three are verified.
