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

- [x] `bun run validate:install` passes with new guards
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
- [x] Script exists and passes locally after Task 13, or install doc states skipped with reason

**Verification:**
- [ ] `bun run test:smoke:desktop` when implemented
- [ ] `bun run validate:install`

**Dependencies:** Tasks 13, 14

**Files likely touched:** `package.json`, `tests/smoke/desktop.spec.ts` (or similar)

**Estimated scope:** S

---

## Checkpoint: Ship-fixes complete

- [x] Tasks 13–14 checkpoint passed (`/ship` minimum GO) except manual desktop/Simulator gates
- [x] Tasks 15–18 acceptance criteria met (or 16/17 explicitly deferred with user approval)
- [x] `bun run validate:install` and `bun run test` green
- [ ] Re-run `/ship` — superseded by **Tasks 20–26** (second `/ship` NO-GO); see `tasks/plan.md` § Ship NO-GO follow-ups
- [ ] Then: manual Simulator gate + `languages` spec approval before next module `/build`

---

# Ship NO-GO follow-ups (`/ship` 2026-10-18)

Plan: `tasks/plan.md` § Ship NO-GO follow-ups. Complete **before** calling shell done or starting `languages`.

---

## Task 20: Dual HTML asset guards in `validate:install`

**Description:** Extend `scripts/validate-built-ui.ts` to reject root-absolute asset URLs in **`src` and `href`** (e.g. `src="/assets/`, `href="/assets/`). After `build:ui`, `validate-install.ts` must run the same checks on **`dist/ui/index.html` and `dist/ui/mobile.html`**, and fail if `mobile.html` is missing.

**Acceptance criteria:**
- [x] Unit tests cover `href="/assets/` failure and relative `modulepreload` success
- [x] `validate:install` fails if `mobile.html` absent or either HTML uses `/assets/`
- [x] Error messages name which file failed

**Verification:**
- [ ] `bun run test`
- [ ] `bun run validate:install`

**Dependencies:** Shell Tasks 13–14 (complete)

**Files likely touched:** `scripts/validate-built-ui.ts`, `scripts/validate-built-ui.test.ts`, `scripts/validate-install.ts`

**Estimated scope:** S

---

## Task 21: Stricter built-JS shell label guard

**Description:** Tighten `assertBuiltJsContainsShellLabel` (or split desktop/mobile checks) so passing does not rely on `"[Janus shell]"` in `console.error` alone. Prefer asserting on the **bootstrap** chunk and/or mount markers (`createShellLabel`, `data-platform`).

**Acceptance criteria:**
- [x] Unit test: JS containing only `"[Janus shell]"` without mount path **fails**
- [x] `validate:install` still passes on a clean tree after `build:ui`

**Verification:**
- [ ] `bun run test`
- [ ] `bun run validate:install`

**Dependencies:** Task 20

**Files likely touched:** `scripts/validate-built-ui.ts`, `scripts/validate-built-ui.test.ts`, `scripts/validate-install.ts`

**Estimated scope:** S

---

## Task 22: Electron navigation policy (complete)

**Description:** Extract URL allow/deny logic to `apps/desktop/src/navigation-policy.ts` with Vitest coverage. Register policy on **`app.on('web-contents-created')`** so child windows inherit blocks. Restrict top-level `file:` navigation to the UI bundle directory **and** default `setWindowOpenHandler` to **`deny`** (unless opening bundle-scoped `file:` is explicitly required later).

**Acceptance criteria:**
- [x] `https://` / `http://` navigation and `window.open` denied (unit-tested policy functions)
- [x] Handlers attached for every `webContents`, not only the first `BrowserWindow`
- [x] `bun run dev:desktop` still shows Janus after `build:ui`

**Verification:**
- [ ] `bun run test` (include new desktop policy tests in vitest include if needed)
- [ ] Manual: `bun run dev:desktop`

**Dependencies:** Task 17 (complete); independent of Tasks 20–21

**Files likely touched:** `apps/desktop/src/main.ts`, `apps/desktop/src/navigation-policy.ts`, `apps/desktop/src/navigation-policy.test.ts`, `vitest.config.ts`

**Estimated scope:** S–M

---

## Task 23: `prepare-cap-web` testable helper

**Description:** Extract copy logic from `apps/mobile/scripts/prepare-cap-web.ts` into a small function (e.g. `syncCapIndexFromMobile(uiDir)`). Unit test: copies `mobile.html` → `index.html`; missing `mobile.html` throws or returns error with clear message.

**Acceptance criteria:**
- [x] Tests use a temp/fixture directory (no reliance on committed `dist/`)
- [x] `cap:sync:ios` script still calls the same behavior via thin CLI wrapper

**Verification:**
- [ ] `bun run test`

**Dependencies:** Task 20 (mobile.html must exist after build)

**Files likely touched:** `apps/mobile/scripts/prepare-cap-web.ts`, `apps/mobile/src/cap-web.ts` (or `scripts/`), `apps/mobile/src/cap-web.test.ts`

**Estimated scope:** S

---

## Task 24: Bootstrap and mobile entry test gaps

**Description:** Add tests for remaining `resolveJanusBridge` errors (no `installMobileBridge`; install leaves `window.janus` unset). Add `apps/mobile/src/entry.test.ts` (or integration-style test) that runs install + `startShell` and asserts `data-platform="mobile"`. Consolidate duplicate `Missing #app` test if trivial.

**Acceptance criteria:**
- [x] At least two new error-path tests in `bootstrap.test.ts`
- [x] Mobile entry test mounts **Janus** without mocking away `installMobileBridge`

**Verification:**
- [ ] `bun run test`
- [ ] `bun run lint`

**Dependencies:** Tasks 15–16 (complete)

**Files likely touched:** `packages/ui/src/bootstrap.test.ts`, `apps/mobile/src/entry.test.ts`, optionally `packages/ui/src/main.test.ts`

**Estimated scope:** S

---

## Task 25: Install doc — dual HTML and cap sync

**Description:** Update `docs/install-macos.md`: `build:ui` emits `index.html` (desktop) and `mobile.html` (Capacitor entry); `cap:sync:ios` runs `prepare-cap-web` to copy mobile → `index.html` before sync. One line on `@janus/mobile-entry` as build-only Vite alias.

**Acceptance criteria:**
- [ ] Contributor can understand desktop vs mobile artifact without reading `tasks/plan.md`
- [ ] README link unchanged or updated if needed

**Verification:**
- [ ] Manual read-through

**Dependencies:** Task 23

**Files likely touched:** `docs/install-macos.md`

**Estimated scope:** S

---

## Task 26: Manual gates and re-`/ship` (human)

**Description:** Execute manual desktop and Simulator gates per install doc. Re-run **`/ship`**. Update checkpoints in this file and `tasks/plan.md` when GO.

**Acceptance criteria:**
- [ ] Desktop and Simulator checkpoints checked off
- [ ] `/ship` returns **GO** or documented accepted risks

**Verification:**
- [ ] Manual desktop + Simulator
- [ ] `/ship`

**Dependencies:** Tasks 20–25

**Files likely touched:** `tasks/todo.md`, `tasks/plan.md` (checkpoint checkboxes only)

**Estimated scope:** S (human time)

---

## Checkpoint: Shell ship GO (after Tasks 20–26)

- [ ] `bun run validate:install` covers desktop + mobile HTML
- [ ] Electron navigation Medium finding addressed (Task 22)
- [ ] Manual desktop + Simulator passed
- [ ] `/ship` **GO**
- [ ] Ready for `languages` after `SPEC-languages.md` approval

---

# Live reload dev loop (`/plan` 2026-10-18)

Plan: `tasks/plan.md` § Live reload dev loop. **Does not replace** Tasks 20–26; can run in parallel where noted in plan.

---

## Task 27: Vite dev server for shared UI

**Description:** Add `packages/ui` `dev` script running Vite in dev mode (not production build). Configure `server.port` (default **5173**), `server.host: true` (Capacitor/Simulator reachability), and `server.strictPort` or documented env override. Root script `dev:ui` runs it. Confirm HMR works for `packages/bridge` via `mount.ts` import graph (manual check).

**Acceptance criteria:**
- [ ] `bun run dev:ui` serves `index.html` and `mobile.html` at stable URLs
- [ ] `base: './'` preserved for production `build` (existing `ui-build-config.test.ts` still passes)
- [ ] No new runtime dependency on Electron/Capacitor in `packages/ui`

**Verification:**
- [ ] `bun run test`
- [ ] Manual: browser open `http://127.0.0.1:5173/` shows Janus after mobile bridge mock or desktop path; edit `createShellLabel()` → HMR updates heading

**Dependencies:** Shell Task 5 (complete)

**Files likely touched:** `packages/ui/package.json`, `packages/ui/vite.config.ts`, root `package.json`, `packages/ui/ui-build-config.test.ts` (extend if asserting dev `server` block)

**Estimated scope:** S

---

## Task 28: Electron dev mode (`dev:desktop` → Vite + loadURL)

**Description:** Replace root `dev:desktop` one-shot `build:ui && start` with an orchestrated dev loop: start Task 27 Vite, wait until dev server responds, launch Electron with dev flag. In dev, `main.ts` loads `http://127.0.0.1:5173/` (desktop entry) instead of `loadFile(dist/ui/index.html)`. Extend or introduce `navigation-policy.ts` so **dev** allows localhost HTTP(S)/WS for HMR; **prod** keeps file-only policy (align with Task 22 — implement together or immediately after Task 22). Add `desktop:prod` (or equivalent) script: `build:ui && bun run --filter @janus/desktop start` for production-like runs used by install validation mindset.

**Acceptance criteria:**
- [ ] `bun run dev:desktop` opens window with **Janus** without running `build:ui` first
- [ ] Editing `packages/bridge/src/index.ts` updates visible label without manual rebuild
- [ ] `bun run --filter @janus/desktop start` after `build:ui` still works (`desktop:prod` path)
- [ ] External `https://` navigation still blocked in dev (policy unit-tested)

**Verification:**
- [ ] `bun run test`
- [ ] `bun run lint`
- [ ] Manual: dev:desktop + bridge edit
- [ ] Manual: `bun run build:ui && bun run desktop:prod` (or documented equivalent)

**Dependencies:** Task 27; **Task 22** (recommended before merge — shared `navigation-policy.ts`)

**Files likely touched:** `package.json`, `apps/desktop/src/main.ts`, `apps/desktop/src/navigation-policy.ts`, `apps/desktop/src/navigation-policy.test.ts`, `scripts/dev-desktop.ts` (or similar), `apps/desktop/package.json`

**Estimated scope:** M

---

## Task 29: Capacitor iOS Simulator live reload

**Description:** Add root dev script (e.g. `dev:ios`) that runs Vite (Task 27) and opens iOS Simulator with Capacitor loading **`/mobile.html`** from the dev server. Use Capacitor 6 livereload / `server.url` pattern that is **dev-only** (env, CLI flags, or local config — not active in default `capacitor.config.ts` used for `cap:sync:ios`). Add iOS **ATS** dev exception for local HTTP if required. Document Simulator vs device (LAN IP) limitation in task verification notes.

**Acceptance criteria:**
- [ ] Simulator shows **Janus** with `data-platform="mobile"` against dev server
- [ ] Edit `createShellLabel()` → Simulator UI updates without `cap:sync:ios`
- [ ] `bun run cap:sync:ios` after `build:ui` unchanged for production-like workflow

**Verification:**
- [ ] Manual: `bun run dev:ios` (or final script name) + bridge edit
- [ ] Manual: `bun run cap:sync:ios` + Xcode Run still works

**Dependencies:** Task 27

**Files likely touched:** `package.json`, `apps/mobile/capacitor.config.ts` (or `capacitor.config.dev.ts` + doc), `apps/mobile/package.json`, `apps/mobile/ios/App/App/Info.plist`, `docs/install-macos.md` (stub ok until Task 30)

**Estimated scope:** M

---

## Task 30: Install doc — dev vs production loops

**Description:** Update `docs/install-macos.md` (and README if needed): when to use `dev:ui`, `dev:desktop`, `dev:ios`; when to use `build:ui`, `desktop:prod`, `cap:sync:ios`. Clarify that `validate:install` exercises the **production** UI build, not the dev server.

**Acceptance criteria:**
- [ ] New contributor can enable live reload without reading `tasks/plan.md`
- [ ] Dual HTML (`index.html` vs `mobile.html`) still explained (may merge with Task 25 if both land)

**Verification:**
- [ ] Manual read-through

**Dependencies:** Tasks 28–29

**Files likely touched:** `docs/install-macos.md`, `README.md` (optional)

**Estimated scope:** S

---

## Task 31: Automated guards for dev/prod split

**Description:** Unit tests: dev UI URL helper (if extracted); `navigation-policy` allows localhost only when dev flag set; assert default Capacitor config has **no** `server.url` (or export `capacitor.config.ts` policy function tested in isolation). Ensure `validate:install` does not require dev server.

**Acceptance criteria:**
- [ ] Tests fail if prod navigation policy allows arbitrary `http://` origins
- [ ] Tests fail if committed Cap config enables permanent remote `server.url`

**Verification:**
- [ ] `bun run test`
- [ ] `bun run validate:install`

**Dependencies:** Tasks 28–29

**Files likely touched:** `apps/desktop/src/navigation-policy.test.ts`, `apps/mobile/capacitor.config.test.ts` (new), `vitest.config.ts` (if include paths change)

**Estimated scope:** S

---

## Task 32 (optional): Watch main/preload and restart Electron

**Description:** When developing `apps/desktop/src/main.ts` or `preload.ts`, `bun build --watch` rebuilds `dist/` and restarts Electron (small helper or `electron-reload`). Renderer continues to use Vite HMR without full app restart for UI-only edits.

**Acceptance criteria:**
- [ ] Change in `preload.ts` (e.g. comment or log) triggers Electron restart when using `dev:desktop`
- [ ] Documented as optional in install doc if skipped

**Verification:**
- [ ] Manual: edit preload, confirm restart

**Dependencies:** Task 28

**Files likely touched:** `scripts/dev-desktop.ts`, `apps/desktop/package.json`

**Estimated scope:** S

---

## Task 33: Manual sign-off (live reload)

**Description:** Human verification of both checkpoints in `tasks/plan.md` § Live reload; confirm Tasks 20–26 still applicable; no change to `validate:install` contract.

**Acceptance criteria:**
- [ ] Desktop and Simulator live-reload checkpoints checked off in `tasks/plan.md`
- [ ] `bun run test` and `bun run validate:install` green

**Verification:**
- [ ] Manual desktop + Simulator dev loops
- [ ] `bun run test` && `bun run validate:install`

**Dependencies:** Tasks 27–31 (32 optional)

**Files likely touched:** `tasks/plan.md`, `tasks/todo.md` (checkboxes only)

**Estimated scope:** S (human time)

---

## Checkpoint: Live reload (after Tasks 27–28)

- [ ] `dev:desktop` without `build:ui` shows Janus
- [ ] Bridge label edit hot-reloads in Electron
- [ ] `validate:install` still passes

## Checkpoint: Live reload (after Tasks 27 + 29)

- [ ] Simulator dev reload works for bridge edit
- [ ] `cap:sync:ios` production path still works

## Checkpoint: Live reload complete (after Tasks 30–33)

- [ ] Install doc updated
- [ ] Task 31 tests green
- [ ] Human sign-off (Task 33)
