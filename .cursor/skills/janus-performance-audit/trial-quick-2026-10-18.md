# Trial Quick audit — 2026-10-18

Phase 1 sign-off for `SPEC-perf-command.md`.

## Scope

- **Mode:** Quick
- **Environment:** source-only
- **Paths:** `packages/ui/src` (mount, editor, i18n)

## Scorecard (Janus /perf)

| Signal | Value | Source | Surface |
|--------|-------|--------|---------|
| Autosave poll interval | 1000ms | `render-editor.ts` | editor |
| i18n catalog load | Once at mount via `getUiLanguage` | `mount.ts` | all |
| Navigation teardown | `root.replaceChildren()` on screen change | `mount.ts` | shelf/editor/settings |

## Ranked findings

1. **Low (potential impact)** — Autosave uses a 1s polling interval rather than debounced `input` saves; acceptable for v1 but long sessions with constant typing always schedule periodic `writeManuscript` IPC when dirty. Monitor if bridge latency grows.

## Positive observations

- Editor back navigation calls `autosave.dispose()` after flush (`render-editor.ts`).
- `onInput` only marks dirty and starts the timer; no per-keystroke bridge calls.
- `initI18n` runs once before first `showShelf()`; catalogs are not re-fetched per render.

## Checklist coverage

- Editor typing / autosave — reviewed
- Navigation / dispose — reviewed
- i18n load — reviewed
- Bundle / mobile entry — not exercised in this pass (no `build:ui` run)
