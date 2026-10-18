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
- [ ] Manual Simulator step in install doc succeeds
- [x] Human review before `/build` on `languages` or manuscript specs

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
- [ ] Manual: `bun run build:ui` then `bun run dev:desktop` — **Janus** in `#app`, `data-platform="desktop"`
- [ ] Manual: `bun run cap:sync:ios` + Simulator — still shows Janus (Capacitor regression check)

### Checkpoint: Ship-fixes complete (after Tasks 13–18)

- [x] No `@janus/mobile` alias in `packages/ui/vite.config.ts`
- [x] `bun run test` green with new bootstrap/bridge tests
- [x] Electron main sets explicit secure `webPreferences` and blocks stray navigation
- [ ] Re-run `/ship` — expect **GO** on blockers (acknowledged risks may remain for CI CVE scan)

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

1. Re-run `/ship` on `main`.
2. Execute manual Simulator gate once if not already done.
3. Proceed to `/spec` + `/plan` for **`languages`** when `SPEC-languages.md` is approved.

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

Review this plan and `tasks/todo.md` before starting `/build` Task 1.
