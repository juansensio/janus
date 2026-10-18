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
- [ ] `bun install`; `bun run test`; `bun run lint`

### Phase 2: Shared presentation
- [x] Task 4: `mountJanusShell` + mount tests
- [x] Task 5: Vite `build:ui` + output path

### Checkpoint: UI artifact
- [x] `bun run build:ui` produces consumable output

### Phase 3: Desktop shell
- [ ] Task 6: Electron main + window
- [ ] Task 7: Preload + `window.janus` + visible Janus

### Phase 4: Mobile shell
- [ ] Task 8: Capacitor package + iOS project
- [ ] Task 9: Mobile bridge + `cap:sync:ios` / `cap:open:ios` + Simulator

### Checkpoint: Both shells
- [ ] Desktop and Simulator show `<main id="app">`, `Janus`, correct `data-platform`

### Phase 5: Install journey
- [ ] Task 10: `docs/install-macos.md` + README link
- [ ] Task 11: `validate:install`
- [ ] Task 12 (optional): `test:smoke:desktop`

### Checkpoint: Shell complete
- [ ] `bun run validate:install` passes locally
- [ ] Manual Simulator step in install doc succeeds
- [ ] Human review before `/build` on `languages` or manuscript specs

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
