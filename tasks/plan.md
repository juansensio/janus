# Implementation Plan: languages slice 1 (interface locale + catalogs)

**Source spec:** `docs/specs/SPEC-languages.md` (slice 1 — **approved 2026-10-18**)

**Archived:** `tasks/archive/library-root-slice-2-1e/`

## Overview

Ship **`@janus/languages`**: registry (`en`, `es`), JSON catalogs, `resolveUiLocale` / `message` / key-parity tests. Extend **`JanusBridge`** with `getUiLanguage()` and `setUiLanguage(code)` returning `{ locale, messages }`. Persist `uiLocale` in `janus-settings.json` (desktop + mobile Capacitor Data) without dropping `libraryRoot`. UI loads the catalog before first paint, uses `t(key)` everywhere, adds a **Language** control in Settings (desktop and mobile), sets `document.documentElement.lang` and editor textarea `lang` to the UI locale.

Book language per book stays out of scope; `Untitled` titles stay English on disk.

## Architecture decisions

- **Layering:** Domain in `services/languages/` only. Shells import `@janus/languages` for resolve/persist/catalog. `packages/ui` never imports `services/*`; it only sees catalogs via the bridge.
- **No i18n framework:** `{placeholder}` substitution in `format-message.ts`; catalogs are `locales/en.json` and `locales/es.json` with identical key sets (enforced by test).
- **Resolution:** `resolveUiLocale(saved, system)` — saved → normalized OS tag → `en`. Invalid saved values are skipped (startup never blocks).
- **Re-render on change:** `setUiLanguage` persists, returns new catalog; Settings handler re-renders current screen. No full app restart (library folder pick still uses reload where slice 2 already does).
- **Settings on mobile:** Enable Settings entry from shelf for language only; `chooseLibraryRoot` stays unsupported.
- **Shared settings type:** Extend desktop `JanusSettings` with optional `uiLocale`; mobile reads/writes the same filename beside library data (not under `library/`).
- **Catalog keys:** Exactly the table in `SPEC-languages.md` § Catalog keys (slice 1). Remove `packages/ui/src/**/strings.ts` and hardcoded chrome (e.g. mount `aria-label`, `formatSourceLabel` literals).

## Dependency graph

```
Task 1: @janus/languages domain + catalogs + tests
    → Task 2: Bridge contract + mock catalogs
        → Task 3: Desktop IPC + JanusSettings.uiLocale
        → Task 4: Mobile settings file + bridge methods
            → Task 5: UI i18n module + mount bootstrap
                → Task 6: Shelf + editor → t()
                    → Task 7: Settings language picker + mobile route
                        → Task 8: Spec approval footnote, CAPABILITY-MAP, install doc
```

Tasks 3 and 4 can run in parallel after Task 2; Task 5 waits for both shells.

## Task list

Full acceptance criteria: **`tasks/todo.md`** Tasks **1–8**.

### Phase 1: Domain + bridge
- [x] Task 1: `services/languages` package
- [x] Task 2: `getUiLanguage` / `setUiLanguage` on bridge + mock

### Checkpoint: Foundation
- [x] `bun run test services/languages` && bridge tests pass

### Phase 2: Shell persistence
- [x] Task 3: Desktop language IPC
- [x] Task 4: Mobile language persistence + bridge

### Checkpoint: Shells
- [x] Desktop + mobile tests for persist merge (`libraryRoot` + `uiLocale`)

### Phase 3: UI integration
- [x] Task 5: `i18n.ts` + async `mountJanusShell`
- [x] Task 6: Shelf and editor catalogs
- [x] Task 7: Settings language `<select>` + mobile Settings

### Checkpoint: UI
- [x] happy-dom: Settings lists English/Español; switch updates labels
- [ ] Manual: `dev:desktop` → Settings → Español → shelf/editor Spanish → relaunch still Spanish

### Phase 4: Docs
- [x] Task 8: Approve spec status, `CAPABILITY-MAP.md`, `install-macos.md`

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missed English literal in UI | Med | Grep for user-facing strings; key-parity test; remove `strings.ts` |
| Settings save drops `libraryRoot` or vice versa | High | Merge on load/save tests in desktop + mobile |
| Mount race (shelf before catalog) | Med | `await getUiLanguage()` before `showShelf()` |
| Mobile had no Settings | Low | Task 7 adds shelf entry + `onOpenSettings` for mobile |

## Open questions

- Spec header still says **not approved** — confirm assumptions in `SPEC-languages.md` § Assumptions, then mark approved in Task 8 (or before `/build` if you prefer).

## Human approval

Review **`tasks/todo.md`**. Approve **`SPEC-languages.md` slice 1** before **`/build` Task 1**.
