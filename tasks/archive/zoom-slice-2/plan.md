# Active plan: zoom slice 2

**Source spec:** [`docs/specs/SPEC-zoom.md`](../../docs/specs/SPEC-zoom.md) — section *Slice 2 — editor zoom bar and page scale*

**Archived:** zoom slice 1 (complete) → [`tasks/archive/zoom-slice-1/`](../zoom-slice-1/)

## Overview

Writers get a pinned bottom bar (`+ zoom (X%) −`) in the manuscript editor. Zoom scales the **page card** (width, padding, and type together), not only body `font-size` inside a fixed `34rem` box. Slice 1 persistence, Settings, keyboard shortcuts, and desktop View menu stay unchanged; no bridge or `@janus/zoom` API changes.

## Architecture decisions

- **Layout:** `.janus-editor` becomes a column: fixed `.editor-chrome`, scrollable `.editor-scrollport` (page only), fixed `.editor-zoom-bar`. The mount root `.janus-editor-shell` keeps `--editor-page-zoom` on the shell (existing `applyEditorPageZoom`).
- **CSS:** Multiply the slice-1 **100%** page measure (`min(34rem, 100% − 2.5rem)`, padding, base font-size) by `var(--editor-page-zoom)`. Title and ProseMirror use `em` relative to `.editor-page` font-size so type tracks the page without duplicate multipliers.
- **Bar sync:** Extend `createEditorZoomController` with an `onPercentChange` callback (or equivalent) invoked after every local apply, including keyboard and menu paths, so the bar label and disabled state stay in sync without duplicating step logic.
- **Bar module:** Small colocated helper (e.g. `editor-zoom-bar.ts`) mounted from `render-editor.ts`; clicks call `controller.applyDirection("in" | "out")` only.

## Dependency graph

```
editor.css page scale + scrollport layout (render-editor DOM)
        │
        ├── controller onPercentChange hook
        │         │
        │         └── zoom bar + i18n
        │
        └── Vitest (width/label) + e2e (bar click, box width)
```

Build order: layout/CSS first (visible Word-like scale), then controller hook, then bar + catalogs, then tests/e2e.

## Task list

### Phase 1: Page scale and scroll

- [x] Task 1: Scaled page layout and scrollport
- [x] Task 2: Controller percent-change notification

**Checkpoint:** At 110% in the editor, `.editor-page` border-box width is ~1.1× the 100% width; chrome and bar are 1×; `bun run test packages/ui` passes.

### Phase 2: Zoom bar

- [x] Task 3: Bottom zoom bar + catalogs
- [x] Task 4: Unit tests for bar and layout

**Checkpoint:** Bar shows `zoom (X%)`, `+`/`−` persist and disable at ends; shortcut updates label; `bun run test` and `bun run lint` pass.

### Phase 3: E2E

- [x] Task 5: Extend zoom e2e for bar and page width

**Checkpoint:** `bun run e2e e2e/flows/zoom.spec.ts` passes; slice 2 acceptance criteria met.

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `min(34rem, 100% − 2.5rem) * factor` interacts badly with narrow windows | Med | Keep 100% formula as spec; test 75% and 200% in Vitest + e2e at desktop width |
| AI comment/draft UI sizes drift | Low | Use `em` on `.editor-page`; spot-check comment chrome in manual pass |
| Bar obscures page on short viewports | Low | Scrollport gets remaining height; bar `flex-shrink: 0` |

## Open questions

None — assumptions in SPEC slice 2 stand unless you change them during `/build`.
