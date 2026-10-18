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
- [ ] `bun run cap:sync:ios` updates web assets
- [ ] `bun run cap:open:ios` works from repo root
- [ ] Simulator shows same shell UI as desktop

**Verification:**
- [ ] `bun run build:ui` + `bun run cap:sync:ios`
- [ ] Manual check: Run in Simulator

**Dependencies:** Task 8, Task 7 (behavioral reference for mount; not a hard package dep)

**Files likely touched:** `apps/mobile/src/native-bridge.ts`, `packages/ui/src/main.ts` (if shared entry), root `package.json`

**Estimated scope:** M

---

## Checkpoint: After Tasks 6–9

- [ ] Desktop and Simulator show `Janus` in `#app`
- [ ] Only `platform()` differs between bridge implementations

---

## Task 10: `docs/install-macos.md`

**Description:** Prerequisites (Bun, Xcode, CocoaPods, Simulator) and ordered commands: clone → install → test → build → desktop → iOS sync → Xcode Run. Call out Simulator as manual mobile gate. Link from `README.md`.

**Acceptance criteria:**
- [ ] Contributor can follow without reading `SPEC-shell.md`
- [ ] README points to install doc

**Verification:**
- [ ] Manual read-through for gaps

**Dependencies:** Tasks 7 and 9

**Files likely touched:** `docs/install-macos.md`, `README.md`

**Estimated scope:** S

---

## Task 11: `validate:install` script

**Description:** `bun run validate:install` runs unit tests, `build:ui`, and asserts expected artifacts exist. Optional headless Electron DOM check only if stable; otherwise document omission.

**Acceptance criteria:**
- [ ] Script fails loudly if build artifacts missing
- [ ] Passes on dev machine after shell tasks complete

**Verification:**
- [ ] `bun run validate:install`

**Dependencies:** Task 10

**Files likely touched:** `scripts/validate-install.ts` (or `.mjs`), `package.json`

**Estimated scope:** S

---

## Task 12 (optional): Desktop smoke test

**Description:** `bun run test:smoke:desktop` if Playwright/Electron driver is cheap; else skip and note in install doc.

**Acceptance criteria:**
- [ ] Documented as required or explicitly skipped

**Verification:**
- [ ] `bun run test:smoke:desktop` when implemented

**Dependencies:** Task 7

**Files likely touched:** `package.json`, `tests/smoke/desktop.spec.ts`

**Estimated scope:** S

---

## Checkpoint: Shell complete

- [ ] Tasks 1–11 acceptance criteria met
- [ ] `bun run validate:install` passes
- [ ] Simulator manual gate executed once per install doc
- [ ] Ready for `/build` on next capability (`languages` after spec approval)
