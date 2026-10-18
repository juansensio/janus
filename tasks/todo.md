# Shell module — task list

Source spec: `docs/specs/SPEC-shell.md`. Plan: `tasks/plan.md`.

Sizing: **S** = 1–2 files, **M** = 3–5 files. No task should exceed ~5 files (generated `ios/` tree excepted for Task 9 only).

---

## Task 1: Root workspace skeleton

**Description:** Root `package.json` with Bun workspaces (`packages/*`, `apps/*`), `tsconfig.base.json`, `.gitignore` (`node_modules`, `dist/`, generated `www`). No `services/`. Script names reserved as no-op or echo until wired: `build:ui`, `dev:desktop`, `test`, `lint`, `cap:sync:ios`, `cap:open:ios`, `validate:install`.

**Acceptance criteria:**
- [x] `bun install` succeeds at repo root
- [x] `bun.lock` present and intended for commit

**Verification:**
- [ ] Manual check: `bun install` on a clean tree

**Dependencies:** None

**Files likely touched:** `package.json`, `tsconfig.base.json`, `.gitignore`, `bun.lock`

**Estimated scope:** S

---

## Task 2: Root test and lint runners

**Description:** Wire `bun run test` (Vitest workspace or root config) and `bun run lint` (pick **one** of oxlint or eslint, pinned). Empty workspace may pass with zero tests until Task 3.

**Acceptance criteria:**
- [x] `bun run test` exits 0
- [x] `bun run lint` exits 0 on shell files added so far

**Verification:**
- [ ] `bun run test`
- [ ] `bun run lint`

**Dependencies:** Task 1

**Files likely touched:** `package.json`, `vitest.config.ts`, lint config file

**Estimated scope:** S

---

## Task 3: `packages/bridge`

**Description:** `@janus/bridge` with `Platform`, `JanusBridge`, `createShellLabel()` per spec. Colocated Vitest test for `createShellLabel()`.

**Acceptance criteria:**
- [x] Exports match spec; no Electron/Capacitor/DOM imports
- [x] Unit test asserts label is `"Janus"`

**Verification:**
- [ ] `bun run test`
- [ ] `bun run lint`

**Dependencies:** Task 2

**Files likely touched:** `packages/bridge/package.json`, `packages/bridge/src/index.ts`, `packages/bridge/src/index.test.ts`

**Estimated scope:** S

---

## Task 4: `mountJanusShell` and mount tests

**Description:** `packages/ui` package with `index.html` (`<main id="app">`), `mountJanusShell(root, bridge)` per spec, Vitest + jsdom/happy-dom tests for heading text and `data-platform`. Depends on `@janus/bridge` only—no Vite build yet.

**Acceptance criteria:**
- [x] Mount helper matches spec behavior
- [x] Tests cover `platform()` `"desktop"` and `"mobile"`
- [x] No `services/` imports

**Verification:**
- [ ] `bun run test`
- [ ] `bun run lint`

**Dependencies:** Task 3

**Files likely touched:** `packages/ui/package.json`, `packages/ui/index.html`, `packages/ui/src/mount.ts`, `packages/ui/src/mount.test.ts`

**Estimated scope:** S–M

---

## Task 5: Vite `build:ui` and output path

**Description:** Vite config builds UI entry + HTML to a single documented directory (e.g. `dist/ui` or `apps/mobile/www` + desktop copy—choose one). Root `bun run build:ui` succeeds. Document output path in a one-line comment in `tasks/plan.md` architecture or `packages/ui/README` snippet (install doc comes in Task 12).

**Acceptance criteria:**
- [x] `bun run build:ui` produces JS + HTML with `#app`
- [x] Build output is gitignored per spec

**Verification:**
- [ ] `bun run build:ui`
- [ ] Manual check: built HTML contains `main#app`

**Dependencies:** Task 4

**Files likely touched:** `packages/ui/vite.config.ts`, `packages/ui/src/main.ts` (entry), root `package.json`

**Estimated scope:** S–M

---

## Checkpoint: After Tasks 1–5

- [x] `bun run test` green
- [x] `bun run build:ui` produces artifacts
- [x] No `services/` directory

---

## Task 6: Electron main process and window

**Description:** `apps/desktop` package with `main.ts`: create `BrowserWindow`, `contextIsolation: true`, load built UI from Task 5 output (file or dev URL stub). Window opens; `#app` may be empty until Task 7.

**Acceptance criteria:**
- [x] `bun run dev:desktop` (or interim script) opens a window
- [x] Renderer loads the shared UI document with `<main id="app">`
- [x] No domain logic in main

**Verification:**
- [ ] `bun run build:ui` then start desktop
- [ ] Manual check: window shows shell HTML

**Dependencies:** Task 5

**Files likely touched:** `apps/desktop/package.json`, `apps/desktop/src/main.ts`, desktop electron builder config (minimal)

**Estimated scope:** M

---

## Task 7: Desktop preload and `window.janus`

**Description:** `preload.ts` exposes `window.janus` implementing `JanusBridge` with `platform(): "desktop"`. Renderer entry calls `mountJanusShell` on `#app`. Visible `Janus` heading and `data-platform="desktop"`.

**Acceptance criteria:**
- [x] Bridge only via preload; context isolation on
- [x] Window shows `Janus` inside `#app`

**Verification:**
- [ ] `bun run test` (unchanged green)
- [ ] Manual check: `bun run dev:desktop`

**Dependencies:** Task 6

**Files likely touched:** `apps/desktop/src/preload.ts`, `packages/ui/src/main.ts` or desktop renderer entry

**Estimated scope:** S–M

---

## Task 8: Capacitor package and iOS project

**Description:** `apps/mobile` with Capacitor 6+, `capacitor.config.ts`, `webDir` pointing at Task 5 output. Run `cap add ios` (or equivalent) so `apps/mobile/ios` exists. No custom bridge wiring yet.

**Acceptance criteria:**
- [x] iOS Xcode project opens from mobile app directory
- [x] `webDir` matches built UI location

**Verification:**
- [ ] `bun run build:ui`
- [ ] Manual check: `npx cap open ios` (or root script once added) opens project

**Dependencies:** Task 5

**Files likely touched:** `apps/mobile/package.json`, `apps/mobile/capacitor.config.ts`, `apps/mobile/ios/**` (generated)

**Estimated scope:** M (file count low; ios tree is generated)

---

## Task 9: Mobile bridge, sync scripts, Simulator sign-off

**Description:** `native-bridge.ts` (or entry) injects mobile `JanusBridge` with `platform(): "mobile"` before mount. Root scripts `cap:sync:ios` (runs `build:ui` then sync) and `cap:open:ios`. Verify Simulator shows `Janus` and `data-platform="mobile"`.

**Acceptance criteria:**
- [x] `bun run cap:sync:ios` updates web assets
- [x] `bun run cap:open:ios` works from repo root
- [x] Simulator shows same shell UI as desktop

**Verification:**
- [ ] `bun run build:ui` + `bun run cap:sync:ios`
- [ ] Manual check: Run in Simulator

**Dependencies:** Task 8, Task 7 (behavioral reference for mount; not a hard package dep)

**Files likely touched:** `apps/mobile/src/native-bridge.ts`, `packages/ui/src/main.ts` (if shared entry), root `package.json`

**Estimated scope:** M

---

## Checkpoint: After Tasks 6–9

- [x] Desktop and Simulator show `Janus` in `#app`
- [x] Only `platform()` differs between bridge implementations

---

## Task 10: `docs/install-macos.md`

**Description:** Prerequisites (Bun, Xcode, CocoaPods, Simulator) and ordered commands: clone → install → test → build → desktop → iOS sync → Xcode Run. Call out Simulator as manual mobile gate. Link from `README.md`.

**Acceptance criteria:**
- [x] Contributor can follow without reading `SPEC-shell.md`
- [x] README points to install doc

**Verification:**
- [ ] Manual read-through for gaps

**Dependencies:** Tasks 7 and 9

**Files likely touched:** `docs/install-macos.md`, `README.md`

**Estimated scope:** S

---

## Task 11: `validate:install` script

**Description:** `bun run validate:install` runs unit tests, `build:ui`, and asserts expected artifacts exist. Optional headless Electron DOM check only if stable; otherwise document omission.

**Acceptance criteria:**
- [x] Script fails loudly if build artifacts missing
- [x] Passes on dev machine after shell tasks complete

**Verification:**
- [ ] `bun run validate:install`

**Dependencies:** Task 10

**Files likely touched:** `scripts/validate-install.ts` (or `.mjs`), `package.json`

**Estimated scope:** S

---

## Task 12 (optional): Desktop smoke test

**Description:** `bun run test:smoke:desktop` if Playwright/Electron driver is cheap; else skip and note in install doc.

**Acceptance criteria:**
- [x] Documented as required or explicitly skipped

**Verification:**
- [ ] `bun run test:smoke:desktop` when implemented

**Dependencies:** Task 7

**Files likely touched:** `package.json`, `tests/smoke/desktop.spec.ts`

**Estimated scope:** S

---

## Checkpoint: Shell complete

- [x] Tasks 1–11 acceptance criteria met
- [x] `bun run validate:install` passes
- [ ] Simulator manual gate executed once per install doc
- [ ] `/ship` GO on shell (blocked until Tasks 13–14; see `tasks/plan.md` ship-fixes)
- [ ] Ready for `/build` on next capability (`languages` after spec approval + ship-fixes)

---

# Shell ship-fixes (`/ship` blockers)

Plan: `tasks/plan.md` § Shell ship-fixes. Do **not** start `languages` until Checkpoint “Minimum ship GO” is done.

---

## Task 13: Vite relative `base` for Electron `file://`

**Description:** Set Vite `base: './'` in `packages/ui/vite.config.ts` so production `index.html` references `./assets/…` instead of `/assets/…`. Rebuild `dist/ui`. This fixes empty `#app` when Electron uses `loadFile` on the built HTML.

**Acceptance criteria:**
- [x] Built `dist/ui/index.html` script `src` is relative (e.g. `./assets/index-*.js`), not root-absolute `/assets/…`
- [x] `bun run build:ui` succeeds unchanged for Capacitor `webDir`
- [x] No business logic added to UI beyond build config

**Verification:**
- [x] `bun run build:ui` then inspect `dist/ui/index.html`
- [x] Manual check: `bun run dev:desktop` — **Janus** visible in `#app`, `data-platform="desktop"`

**Dependencies:** Shell Tasks 1–11 (complete)

**Files likely touched:** `packages/ui/vite.config.ts`

**Estimated scope:** S

---

## Task 14: `validate:install` asset-path regression guard

**Description:** Extend `scripts/validate-install.ts` to fail if built `index.html` contains absolute asset URLs (e.g. `src="/assets/`). Optionally assert at least one built JS file under `dist/ui/assets/` contains the shell label text `Janus` (proves bundle includes mount path).

**Acceptance criteria:**
- [x] `validate:install` exits non-zero when `index.html` uses `/assets/` paths (regression test via fixture or documented manual negative check once)
- [x] `validate:install` passes on a clean tree after Task 13
- [x] Error messages name the failing check clearly

**Verification:**
- [ ] `bun run validate:install`
- [ ] `bun run test` (unchanged green)

**Dependencies:** Task 13

**Files likely touched:** `scripts/validate-install.ts` (optional small helper + unit test colocated if extracted)

**Estimated scope:** S

---

## Checkpoint: Minimum ship GO (after Tasks 13–14)

- [ ] `bun run validate:install` passes with new guards
- [ ] Manual desktop: Janus in `#app`
- [ ] Manual Simulator: `cap:sync:ios` + Run — Janus still visible (`data-platform="mobile"`)

---

## Task 15: UI bootstrap fail-fast (no silent wrong bridge)

**Description:** Harden `packages/ui/src/main.ts`: after any bridge setup, throw a clear error if `window.janus` is missing. Do **not** fall back to mobile `installMobileBridge` when running under Electron (preload is the only desktop source). Add `.catch()` on `start()` so renderer failures are visible.

**Acceptance criteria:**
- [x] Missing `#app` still throws `Missing #app`
- [x] Missing `window.janus` on desktop path throws explicit error (not obscure `platform()` on undefined)
- [x] Capacitor/mobile path still mounts with `data-platform="mobile"` after Task 16 (or interim mobile install until 16 lands)

**Verification:**
- [ ] `bun run test`
- [ ] Manual desktop + Simulator smoke after Task 13

**Dependencies:** Task 13

**Files likely touched:** `packages/ui/src/main.ts`

**Estimated scope:** S

---

## Task 16: Decouple `packages/ui` from `apps/mobile`

**Description:** Remove `@janus/mobile` Vite alias and dynamic import from `packages/ui`. Mobile shell sets `window.janus` before loading the shared bundle (e.g. `apps/mobile` entry that calls `installMobileBridge()` then imports shared `main`, or Vite multi-page `index` + `mobile.html`). Desktop build must not emit unused `native-bridge` chunk if avoidable.

**Acceptance criteria:**
- [x] `packages/ui` depends only on `@janus/bridge` (no import path into `apps/mobile`)
- [x] `packages/ui/vite.config.ts` has no `apps/mobile` alias
- [ ] Simulator still shows Janus with `data-platform="mobile"`
- [ ] Desktop still shows Janus with `data-platform="desktop"`

**Verification:**
- [ ] `bun run build:ui`
- [ ] `bun run validate:install`
- [ ] Manual: `dev:desktop` and Simulator

**Dependencies:** Task 13 (same `dist/ui` output); coordinate with Task 15

**Files likely touched:** `packages/ui/vite.config.ts`, `packages/ui/src/main.ts`, `apps/mobile/src/` (entry), possibly `packages/ui/index.html` or mobile-specific HTML stub

**Estimated scope:** M

---

## Task 17: Electron main security hardening

**Description:** In `apps/desktop/src/main.ts`, set explicit secure `webPreferences` (`nodeIntegration: false`, `sandbox: true`, `webSecurity: true`). Add `webContents.setWindowOpenHandler` and navigation handlers to deny opening or navigating to unexpected `http(s):` URLs (allow `file:` / loaded bundle only).

**Acceptance criteria:**
- [x] `contextIsolation: true` unchanged; preload still sole bridge exposure
- [x] Popups and top-level navigation to arbitrary http(s) URLs denied (or opened via validated `shell.openExternal` if you add external link support later)
- [ ] `bun run dev:desktop` still loads Janus after Tasks 13–16

**Verification:**
- [ ] `bun run test`
- [ ] Manual: desktop window still works

**Dependencies:** Task 13 (working UI load)

**Files likely touched:** `apps/desktop/src/main.ts`

**Estimated scope:** S

---

## Task 18: Bootstrap, bridge, and mount unit tests

**Description:** Add Vitest coverage: `apps/mobile/src/native-bridge.test.ts` (`installMobileBridge` → `platform()` mobile); `packages/ui/src/main.test.ts` (happy path with mock `window.janus`, missing `#app`); optional mount re-mount test (second `mountJanusShell` clears prior children). Extract minimal test hooks if needed without pulling Electron into unit tests.

**Acceptance criteria:**
- [x] At least one test fails if `native-bridge` returns wrong platform
- [x] At least one test covers `main.ts` missing `#app` error path
- [x] No Electron in unit test suite (happy-dom only)

**Verification:**
- [ ] `bun run test`
- [ ] `bun run lint`

**Dependencies:** Tasks 15–16 (stable bootstrap behavior)

**Files likely touched:** `packages/ui/src/main.test.ts`, `apps/mobile/src/native-bridge.test.ts`, `packages/ui/src/mount.test.ts` (extend)

**Estimated scope:** S–M

---

## Task 19 (optional): Desktop smoke test

**Description:** Wire `bun run test:smoke:desktop` (Playwright Electron or headless load of `dist/ui` with injected bridge) asserting `#app` contains **Janus** and `data-platform="desktop"`. Update `docs/install-macos.md` if implemented. Skip if dependency cost is too high — document skip.

**Acceptance criteria:**
- [ ] Script exists and passes locally after Task 13, or install doc states skipped with reason

**Verification:**
- [ ] `bun run test:smoke:desktop` when implemented
- [ ] `bun run validate:install`

**Dependencies:** Tasks 13, 14

**Files likely touched:** `package.json`, `tests/smoke/desktop.spec.ts` (or similar)

**Estimated scope:** S

---

## Checkpoint: Ship-fixes complete

- [ ] Tasks 13–14 checkpoint passed (`/ship` minimum GO)
- [ ] Tasks 15–18 acceptance criteria met (or 16/17 explicitly deferred with user approval)
- [ ] `bun run validate:install` and `bun run test` green
- [ ] Re-run `/ship` — no Critical blockers
- [ ] Then: manual Simulator gate + `languages` spec approval before next module `/build`
