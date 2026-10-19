# Active tasks: zoom slice 2

**Spec:** [`docs/specs/SPEC-zoom.md`](../../docs/specs/SPEC-zoom.md) (Slice 2)

**Archived:** slice 1 → [`tasks/archive/zoom-slice-1/`](../zoom-slice-1/)

## Task 1: Scaled page layout and scrollport

- [x] Wrap `.editor-page` in `.editor-scrollport` in `render-editor.ts`; keep `.editor-chrome` outside scrollport
- [x] `editor.css`: scale page width, padding, and base `font-size` with `--editor-page-zoom`; drop per-element `calc(* var(--editor-page-zoom))` on title/body in favor of `em`
- [x] Editor column fills viewport; scrollport `overflow: auto`; page stays centered when it fits
- [x] Acceptance: at 100% wide window, 100% page width matches pre-slice-2 behavior; at 200% page width ≈ 2× 100% width
- [x] Verify: `bun run test packages/ui/src/editor`

**Files:** `packages/ui/src/editor/render-editor.ts`, `packages/ui/src/styles/editor.css`

## Task 2: Controller percent-change notification

- [x] Add `onPercentChange?: (percent: number) => void` (or subscribe API) to `createEditorZoomController`; fire after `applyLocal` and after successful persist
- [x] Acceptance: keyboard step and `applyDirection` both notify with the displayed percent
- [x] Verify: extend `editor-zoom.test.ts`; `bun run test packages/ui/src/editor/editor-zoom.test.ts`

**Files:** `packages/ui/src/editor/editor-zoom.ts`, `packages/ui/src/editor/editor-zoom.test.ts`

## Task 3: Bottom zoom bar + catalogs

- [x] Mount bar in `render-editor.ts`; wire to controller; dispose on teardown
- [x] Keys in `en.json` / `es.json` for bar label and accessible names for `+` / `−`
- [x] Acceptance: bar visible in editor; clicks persist; label matches CSS variable percent
- [x] Verify: manual or Task 4 tests

**Files:** `packages/ui/src/editor/editor-zoom-bar.ts`, `packages/ui/src/editor/render-editor.ts`, `services/languages/locales/en.json`, `services/languages/locales/es.json`

## Task 4: Unit tests for bar and layout

- [x] Vitest: bar label updates on `onPercentChange`; plus/minus call `applyDirection`; disabled at min/max
- [x] Vitest: `.editor-page` computed width ratio ~1.1 when `--editor-page-zoom` is 1.1 (happy-dom)
- [x] Verify: `bun run test packages/ui`; `bun run lint`

**Files:** `packages/ui/src/editor/editor-zoom-bar.test.ts`, `editor-zoom.test.ts` (if needed)

## Task 5: E2E bar step and page width

- [x] Helper(s) to read bar label and `.editor-page` width in `e2e/helpers/ui.ts`
- [x] From 100%, click bar `+` once → 110% label and wider page box than baseline
- [x] Verify: `bun run e2e e2e/flows/zoom.spec.ts`

**Files:** `e2e/flows/zoom.spec.ts`, `e2e/helpers/ui.ts`

## Checkpoint (after Task 5)

- [x] All slice 2 acceptance criteria in SPEC-zoom.md
- [x] `bun run test` and `bun run lint` green
- [x] Ready for `/build` completion / PR review
