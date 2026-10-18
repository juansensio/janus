# Implementation Plan: shell module

## Overview

Janus currently has approved specs and agent tooling only—no monorepo, apps, or packages on disk. This plan implements **`docs/specs/SPEC-shell.md`**: a Bun workspace with shared TypeScript (`packages/bridge`, `packages/ui`), Electron desktop, Capacitor iOS, documented macOS install journey, and `validate:install`. Feature modules (`languages`, `manuscript`, …) wait until shell sign-off. `docs/specs/SPEC-languages.md` is **not approved** and is out of scope here.

## Architecture decisions

- **Bun workspaces** at repo root; `bun.lock` committed; root scripts are the public dev interface (`dev:desktop`, `build:ui`, `test`, `validate:install`, …).
- **Single UI bundle** built with Vite from `packages/ui` to **`dist/ui`** at repo root; Electron and Capacitor `webDir` both consume that path.
- **`JanusBridge`** is the only host contract; `window.janus` on desktop; mobile injects implementation before `mountJanusShell`.
- **No `services/`** in shell work; static label `"Janus"` via `createShellLabel()` only—no locale or domain logic in UI (invariant 12).
- **Lint:** pick **one** of oxlint or eslint in **Task 2** (pin version); do not add a second linter without asking (per spec).
- **Unit tests:** Vitest + jsdom/happy-dom for bridge and UI mount (**Tasks 3–4**); Electron smoke optional (**Task 12**).

## Dependency graph

```
Task 1 workspace
    → Task 2 test/lint
        → Task 3 bridge
            → Task 4 mount + mount tests
                → Task 5 Vite build:ui
                    ├→ Task 6–7 Electron (main, then preload)
                    └→ Task 8–9 Capacitor (ios scaffold, then bridge + sync)
                            → Task 10 install doc
                                → Task 11 validate:install
```

## Task list

Full acceptance criteria: **`tasks/todo.md`** (12 tasks, all **S** or **M**).

### Phase 1: Foundation
- [x] Task 1: Root workspace skeleton
- [x] Task 2: Root test and lint runners
- [x] Task 3: `packages/bridge`

### Checkpoint: Foundation
- [x] `bun install`; `bun run test`; `bun run lint`

### Phase 2: Shared presentation
- [x] Task 4: `mountJanusShell` + mount tests
- [x] Task 5: Vite `build:ui` + output path

### Checkpoint: UI artifact
- [x] `bun run build:ui` produces consumable output

### Phase 3: Desktop shell
- [x] Task 6: Electron main + window
- [x] Task 7: Preload + `window.janus` + visible Janus

### Phase 4: Mobile shell
- [x] Task 8: Capacitor package + iOS project
- [x] Task 9: Mobile bridge + `cap:sync:ios` / `cap:open:ios` + Simulator

### Checkpoint: Both shells
- [x] Desktop and Simulator show `<main id="app">`, `Janus`, correct `data-platform`

### Phase 5: Install journey
- [x] Task 10: `docs/install-macos.md` + README link
- [x] Task 11: `validate:install`
- [x] Task 12 (optional): `test:smoke:desktop` (skipped; documented in install doc)

### Checkpoint: Shell complete
- [x] `bun run validate:install` passes locally
- [x] Manual Simulator step in install doc succeeds
- [x] Shell signed off (`/ship` GO 2026-10-18); **library slice 1** is next (`SPEC-library.md` approved)

---

## Shell ship-fixes (`/ship` NO-GO, 2026-10-18)

### Overview

Shell Tasks 1–11 are implemented and `validate:install` passes, but **`/ship` returned NO-GO**: Vite emits absolute `/assets/…` URLs, so Electron `loadFile(file://…)` does not load the bundle and `#app` stays empty. Automated checks did not catch this. This phase closes that gap and addresses follow-ups from parallel **code-reviewer**, **security-auditor**, and **test-engineer** reports without starting `languages`.

**Source:** `docs/specs/SPEC-shell.md` acceptance (Janus visible in `#app` on desktop); install journey in `docs/install-macos.md`.

### Architecture decisions (fixes)

- **Relative asset base:** Vite `base: './'` so one `dist/ui` works for **Electron `file://`** and **Capacitor** (verify Simulator after Task 13).
- **Install gate owns regression:** `validate:install` asserts built HTML uses relative asset URLs (not `/assets/`); optional assertion that built JS contains the shell label string.
- **Bridge bootstrap:** Shared `packages/ui` entry must not silently install the **mobile** bridge on desktop if preload fails; fail fast with a clear error (Capacitor-only path sets `window.janus` before mount).
- **Decouple `packages/ui` from `apps/mobile`:** Remove Vite alias `@janus/mobile` from `packages/ui`; mobile bootstrap lives under `apps/mobile` (second entry or pre-mount script), per `AGENTS.md` invariant 10.
- **Electron defense in depth:** Explicit `webPreferences`; deny unexpected navigation and `window.open` to non-file origins (preventive; no user content yet).
- **Tests:** Colocated Vitest for `main.ts` bootstrap, `native-bridge`, and mount edge cases; optional `test:smoke:desktop` reopens Task 12 if cheap after Task 13.

### Dependency graph (ship-fixes)

```
Task 13 Vite base './'
    → Task 14 validate:install asset checks
        → Checkpoint: minimum ship GO (manual dev:desktop)
Task 13
    → Task 16 mobile bootstrap decouple (can run after 14)
Task 15 bootstrap fail-fast (after 13; parallel with 14)
Task 17 Electron hardening (parallel with 14–16; only apps/desktop)
Task 13 + 15/16
    → Task 18 unit tests (bootstrap + bridge + mount edges)
Task 13 + 14
    → Task 19 (optional) desktop smoke
```

### Task list (ship-fixes)

Full acceptance criteria: **`tasks/todo.md`** Tasks 13–19.

| Phase | Tasks | Outcome |
|-------|-------|---------|
| **A — Unblock ship** | 13 → 14 | Desktop loads built UI; CI-style gate catches absolute URLs |
| **B — Boundaries & trust** | 15 → 16 | Clear errors; UI package no longer imports `apps/mobile` |
| **C — Hardening & proof** | 17 → 18 | Electron navigation policy; automated bootstrap/bridge tests |
| **D — Optional** | 19 | `test:smoke:desktop` if Playwright/Electron driver is acceptable |

### Checkpoint: Minimum ship GO (after Tasks 13–14)

- [x] `dist/ui/index.html` references `./assets/…` (not `/assets/…`)
- [x] `bun run validate:install` passes including new checks
- [x] Manual: `bun run build:ui` then `bun run dev:desktop` — **Janus** in `#app`, `data-platform="desktop"`
- [x] Manual: `bun run cap:sync:ios` + Simulator — still shows Janus (Capacitor regression check)

### Checkpoint: Ship-fixes complete (after Tasks 13–18)

- [x] No `@janus/mobile` alias in `packages/ui/vite.config.ts`
- [x] `bun run test` green with new bootstrap/bridge tests
- [x] Electron main sets explicit secure `webPreferences` and blocks stray navigation
- [x] Re-run `/ship` — **GO** (acknowledged risks documented)

### Risks and mitigations (ship-fixes)

| Risk | Impact | Mitigation |
|------|--------|------------|
| `base: './'` breaks Capacitor asset resolution | High | Task 13 verification includes Simulator step in checkpoint |
| Splitting mobile entry duplicates small amount of boot code | Low | Keep `installMobileBridge` in `apps/mobile`; UI only calls `mountJanusShell` |
| Playwright + Electron flaky in CI | Med | Task 19 optional; Task 14 required gate suffices for GO |
| Two vite entries drift | Med | Task 16 documents single shared `mount` import; one `build:ui` output |

### Open questions

- **Task 19:** Approve adding Playwright (or Electron driver) devDependency for smoke, or keep manual desktop gate only?
- **Task 17 scope:** Block all `http(s):` navigation now, or only `setWindowOpenHandler` until external links exist?

### After ship-fixes

1. Complete **Ship NO-GO follow-ups** (Tasks 20–25 below).
2. Re-run `/ship` on `main`.
3. Execute manual Simulator gate once if not already done.
4. Proceed to `/spec` + `/plan` for **`languages`** when `SPEC-languages.md` is approved.

---

## Ship NO-GO follow-ups (2026-10-18, second `/ship`)

### Overview

Tasks 13–19 landed the original ship-fixes; a second **`/ship` returned NO-GO** after parallel code-reviewer, security-auditor, and test-engineer passes. Blockers: **manual desktop/Simulator gates** still open; **`validate:install` only checks desktop `index.html`** while Capacitor uses `mobile.html` → `index.html` via `prepare-cap-web.ts`; **Electron navigation policy** is incomplete (handlers only on first window, any `file:` URL allowed). Recommended: broader HTML asset patterns, stricter JS label guard, bootstrap/entry tests, install doc for cap web swap.

**Source:** `/ship` synthesis on `main` @ `4573f5b`; `docs/specs/SPEC-shell.md` acceptance (Janus in `#app` on desktop and Simulator).

**Out of scope:** `languages` module; Playwright desktop smoke (Task 19 remains skipped unless explicitly approved).

### Architecture decisions (follow-ups)

- **Install gate owns both MPA outputs:** After `build:ui`, assert `dist/ui/index.html` and `dist/ui/mobile.html` (relative assets, `#app`). Optionally assert `prepare-cap-web` copy semantics via extracted, testable helper.
- **Label guard targets mount path:** Built-JS check must not pass on `"[Janus shell]"` log text alone; prefer `bootstrap-*.js` or `createShellLabel` / `data-platform` markers.
- **Electron navigation:** Extract pure URL policy (`navigation-policy.ts`); attach handlers on **`app.on('web-contents-created')`** for every `webContents`; restrict `file:` to the UI bundle directory **or** default `setWindowOpenHandler` → `deny` until external links are a product requirement (pick one in Task 22 — default: deny popups + bundle-scoped `file:` for top-level navigation).
- **Build-time mobile entry alias:** Keep `@janus/mobile-entry` in `packages/ui/vite.config.ts` as **documented build-only wiring** (no runtime import from `packages/ui` source). Do not move mobile Vite build unless Task 16 acceptance is rewritten — document in `tasks/plan.md` and one line in `docs/install-macos.md`.

### Dependency graph (follow-ups)

```
Task 20 validate mobile.html + href guards (+ unit tests)
    → Task 21 stricter JS label guard
Task 20
    → Task 23 prepare-cap-web helper + tests (can parallel with 21)
Task 22 Electron navigation policy (extract + tests) — parallel with 20–21
Task 20–22
    → Task 24 bootstrap + mobile entry test gaps
Task 23
    → Task 25 install doc (cap web swap + mobile-entry note)
Task 20–25
    → Checkpoint: manual desktop + Simulator
    → Task 26 re-run /ship (human)
```

### Task list (follow-ups)

Full acceptance criteria: **`tasks/todo.md`** Tasks 20–26.

| Phase | Tasks | Outcome |
|-------|-------|---------|
| **A — Install gates** | 20 → 21 → 23 | CI catches mobile HTML regressions and cap swap failures |
| **B — Electron security** | 22 | Medium `/ship` finding addressed |
| **C — Tests & docs** | 24 → 25 | Bootstrap/entry coverage; contributor understands dual HTML |
| **D — Sign-off** | 26 | Manual gates + `/ship` GO |

### Checkpoint: Ship GO (after Tasks 20–25)

- [x] `bun run validate:install` asserts **both** `index.html` and `mobile.html`
- [x] `bun run test` includes navigation-policy and prepare-cap-web tests
- [x] Manual: `bun run dev:desktop` — Janus in `#app`, `data-platform="desktop"`
- [x] Manual: `bun run cap:sync:ios` + Simulator — Janus, `data-platform="mobile"`
- [x] `/ship` — **GO** (no blockers; acknowledged risks documented)

### Risks and mitigations (follow-ups)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stricter JS guard flakes on minification | Low | Assert on `bootstrap` chunk or stable substring from `createShellLabel` |
| Deny-all `window.open` breaks future in-app links | Med | Document; re-enable with `shell.openExternal` when links exist |
| `web-contents-created` handler affects devtools | Low | Scope handlers to app windows only if needed |

### Open questions

- **Task 22:** Deny all `window.open` vs allow bundle-scoped `file:` popups? (Recommend deny-all for shell.)
- **Task 21:** Require label in `bootstrap-*.js` only, or any chunk reachable from each HTML entry?

### After follow-ups

1. Mark shell checkpoint complete in `tasks/todo.md`.
2. Re-run `/ship`.
3. Approve `SPEC-languages.md` and plan languages module.

## Parallelization opportunities

Per the planning skill, this section records where multiple agents or sessions can work at once. **`tasks/todo.md` stays sequential** (dependencies only); use this section when splitting work across people or worktrees.

| When | Safe to parallelize | Must be sequential | Needs coordination |
|------|---------------------|--------------------|--------------------|
| **After Task 5** | **Desktop track:** Tasks 6 → 7. **Mobile track:** Tasks 8 → 9. Tracks touch different `apps/*` trees. | Tasks 1→2→3→4→5 (shared `packages/` and root scripts). Task 7 before Task 12 smoke. | **Task 5** fixes `webDir` / build output path—both tracks must use the same path. **Task 4/5** own `packages/ui` entry; if mobile needs entry changes in Task 9, merge or serialize edits to `main.ts`. |
| **After Tasks 7 and 9** | Task **10** (install doc) can draft in parallel with Task **12** (desktop smoke)—no shared files if smoke lives under `tests/smoke/`. | Task **11** `validate:install` after Task 10 (doc describes what the script checks). | Install doc must list final script names from Tasks 7 and 9. |
| **After shell sign-off** | Spec/plan **`library`** and **`ai-assist`** in parallel (see `CAPABILITY-MAP.md`) once **`manuscript`** exists. | Capability build order: shell → languages → manuscript → library / ai-assist. | New modules extend `JanusBridge` and UI mount—agree contract before parallel implementation. |

**Practical split for two builders:** Builder A: Tasks 6–7 (+ optional 12). Builder B: Tasks 8–9. Rejoin for Tasks 10–11.

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Capacitor/Xcode/CocoaPods drift on contributor machines | High | Document exact prerequisite versions in Task 10; keep mobile gate manual until CI macOS runner exists |
| Dual UI output paths confuse `cap sync` | Med | Single output path in Task 5; `cap:sync:ios` always runs `build:ui` first (Task 9) |
| Electron + Vite HMR wiring complexity | Med | Task 6 ships load-built-UI first; HMR only if cheap inside Task 6–7 |
| Accidental domain code in UI or main process | Med | Grep for `services/` imports; AGENTS.md invariants 10–12 |
| Bun version mismatch | Low | Document minimum Bun in Task 10; CI later uses frozen lockfile |

## Open questions

- None blocking shell (per `SPEC-shell.md`). **Languages** waits for shell done + spec approval.

## After shell

1. Approve `SPEC-languages.md` if still draft.
2. Plan `services/languages` + bridge wiring for UI locale (separate plan revision).
3. Spec and plan `manuscript` per `CAPABILITY-MAP.md` build order.

## Human approval

Review this plan and `tasks/todo.md` before starting `/build` Task 1 or **Task 20** (Ship NO-GO follow-ups).

---

## Live reload dev loop (2026-10-18)

### Overview

Today `bun run dev:desktop` runs a **one-shot** `build:ui` and loads **`file://`** `dist/ui` — edits to `packages/bridge` or `packages/ui` do not refresh until rebuild. **`SPEC-shell.md`** calls for Vite HMR against Electron where practical; Capacitor can load the same dev server via `server.url` / CLI livereload on iOS Simulator.

This phase adds a **dev-only** path: Vite dev server (HMR) for the shared UI graph, Electron `loadURL` in dev, optional Capacitor Simulator livereload for `mobile.html`, while **`build:ui` + `validate:install` + `cap:sync:ios`** stay the production/CI contract.

**Relationship to open work:** **Tasks 20–26** (ship NO-GO follow-ups) remain in `tasks/todo.md`. Live reload is **Tasks 27–33** appended below. Desktop dev navigation must allow `http://localhost` (and HMR WebSocket) — coordinate with **Task 22** (extract `navigation-policy.ts` + dev allowlist) so ship security and dev ergonomics land in one policy module.

**Source:** `docs/specs/SPEC-shell.md` (Commands, dev desktop HMR note); user report that changing `createShellLabel()` does not reload.

### Architecture decisions

- **No `electron-vite` migration** for shell — keep `bun build` for main/preload; add a small **orchestrator** (Bun script under `scripts/` or pinned `concurrently` + `wait-on`) rather than a new bundler stack (YAGNI, spec “ask first” on bundler switch).
- **Single Vite dev server** in `packages/ui` (`vite` with `server.host: true`, fixed port **5173** unless occupied — document env override). Watches workspace deps (`@janus/bridge`, `@janus/mobile-entry` alias) via Vite defaults.
- **Desktop dev:** `JANUS_DEV=1` (or `NODE_ENV=development`) → `main.ts` loads `http://127.0.0.1:5173/` (desktop `index.html`). **Production / CI:** unchanged `loadFile(dist/ui/index.html)`.
- **Navigation policy:** In dev only, allow `http://127.0.0.1` / `http://localhost` (and `ws:` for HMR) on top of existing `file:` rules; deny external `http(s):` in production. Implement in **`navigation-policy.ts`** (Task 22 + Task 28 overlap — do policy extraction before or as part of Task 28).
- **Main/preload reload:** Second slice — `bun build --watch` on desktop `src/` and **restart Electron** when `dist/main.js` or `dist/preload.js` changes (no main-process HMR). Renderer changes (bridge/UI) use Vite HMR without restart.
- **Mobile dev:** Root `dev:ios` (name TBD) runs Vite + Capacitor with **`mobile.html`** entry (`http://127.0.0.1:5173/mobile.html` on Simulator). Use Capacitor 6 **`server.url`** via env-specific config or CLI livereload — **not** committed as always-on in `capacitor.config.ts` (release builds must keep `webDir: dist/ui` only).
- **ATS (iOS):** Dev-only `NSAppTransportSecurity` exception for local networking in `Info.plist` (or Capacitor-documented approach); document that this is for Simulator dev, not App Store release hardening.
- **Scripts:** `dev:desktop` becomes the **live** loop; add **`desktop:prod`** (or document `build:ui && bun run --filter @janus/desktop start`) for production-like smoke matching `validate:install`.

### Dependency graph (live reload)

```
Task 27 Vite dev server + root dev:ui
    → Task 28 Electron dev orchestration + loadURL + dev navigation allowlist
        → Checkpoint: desktop HMR (edit bridge → UI updates)
Task 27
    → Task 29 Capacitor dev config + iOS ATS + dev:ios script
        → Checkpoint: Simulator livereload (edit bridge → UI updates)
Task 22 (navigation-policy extract) — parallel with 27; merge before 28 ships
Task 28 + 29
    → Task 30 docs (install-macos dev vs prod loops)
Task 28 + 29
    → Task 31 automated tests (dev URL resolver, policy allowlist, no server.url in prod cap config)
Task 30 + 31
    → Task 32 (optional) main/preload watch + Electron restart
Task 33 human: manual gates + confirm validate:install unchanged
```

### Task list (live reload)

Full acceptance criteria: **`tasks/todo.md`** Tasks **27–33**.

| Phase | Tasks | Outcome |
|-------|-------|---------|
| **A — Shared dev server** | 27 | `dev:ui` serves desktop + mobile HTML with HMR |
| **B — Desktop** | 28 (+ Task 22 coordination) | `dev:desktop` opens Electron against Vite; bridge edits hot-reload |
| **C — iOS Simulator** | 29 | Documented/scripted Cap livereload against same Vite server |
| **D — Docs & gates** | 30–31 | Contributors know dev vs prod; tests guard policy/config |
| **E — Optional** | 32 | Main/preload watch restart |
| **F — Sign-off** | 33 | Manual desktop + Simulator dev checks |

### Checkpoint: Desktop live reload (after Tasks 27–28)

- [x] `bun run dev:desktop` without prior `build:ui` shows **Janus** in `#app`
- [x] Change `createShellLabel()` in `packages/bridge` → UI updates within a few seconds (HMR or full reload)
- [x] `bun run build:ui && bun run validate:install` still passes (prod path untouched)

### Checkpoint: Mobile live reload (after Tasks 27 + 29)

- [x] Simulator shows **Janus**, `data-platform="mobile"`, via dev server URL
- [x] Edit `packages/bridge` → Simulator webview updates without `cap sync`
- [x] `bun run cap:sync:ios` after `build:ui` still works for release-like runs

### Checkpoint: Live reload complete (after Tasks 30–33)

- [x] `docs/install-macos.md` describes `dev:desktop`, `dev:ui`, `dev:ios` (or final names), and production `build:ui` / `cap:sync:ios`
- [x] `bun run test` includes dev-policy / config tests from Task 31
- [x] Tasks 20–26 ship follow-ups still tracked separately; no regression on their acceptance criteria

### Risks and mitigations (live reload)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Task 22 denies `http://localhost` and breaks dev | High | Single `navigation-policy.ts` with explicit dev allowlist (Task 28) |
| Simulator cannot reach Mac `localhost` | Med | `server.host: true`; Cap `--external` / documented LAN IP fallback in Task 29 |
| Committed `server.url` breaks offline Cap builds | High | Dev URL only via env, CLI, or gitignored `capacitor.config.local.ts` pattern — test in Task 31 |
| Two dev entry HTMLs drift | Low | Same Vite MPA; mobile dev uses `/mobile.html` explicitly |
| Extra root devDependencies (`concurrently`) | Low | Prefer Bun orchestrator script; pin if npm dep added |

### Open questions

- **Script names:** Keep `dev:desktop` as HMR (spec-aligned) and add `desktop:prod`, or add `dev:desktop:hmr` and leave `dev:desktop` as build-then-run?
- **Task 32:** Required for shell sign-off or optional nice-to-have for preload edits?
- **Capacitor:** Prefer `cap run ios --livereload` vs hand-rolled `server.url` in a local config file?

### Parallelization (live reload vs ship follow-ups)

| Work | Parallel safe? | Notes |
|------|----------------|-------|
| Task 27 + Tasks 20–21 | Yes | Different files (`packages/ui` vs `scripts/validate-*`) |
| Task 28 + Task 22 | **Coordinate** | Same `apps/desktop/src/main.ts` / `navigation-policy.ts` — serialize or one PR |
| Task 29 + Task 23–25 | Mostly yes | Task 25 doc should mention dev loops after Task 30 merges |
| Task 31 tests | After 28–29 | |

### Human approval (live reload)

Review **Tasks 27–33** in `tasks/todo.md` before `/build`. Prefer finishing **Task 22** (or folding dev allowlist into Task 28) before treating desktop live reload as done.

---

## Shell module — closed (2026-10-18)

All shell tasks (1–11, ship-fixes 13–26, live reload 27–33 except optional Task 32 skipped) are complete. `/ship` **GO** with manual gates verified. Task 32 (preload watch) remains optional/nice-to-have.

**Next module:** `docs/specs/SPEC-library.md` — active plan at repo-root `tasks/plan.md` (not appended here).
