# Active tasks: zoom slice 1

**Spec:** [`docs/specs/SPEC-zoom.md`](../docs/specs/SPEC-zoom.md)

## Task 1: Domain `@janus/zoom` and settings normalization

- [x] Add `services/zoom` with levels, normalize, step in/out/reset
- [x] Extend `JanusSettings` / `normalizeJanusSettings` with `editorZoomPercent`
- [x] Update `CAPABILITY-MAP.md` with `zoom` module row
- [x] Vitest for domain + normalize

## Task 2: Bridge contract and mock

- [x] `getEditorZoom` / `setEditorZoom` on `JanusBridge` + `INVALID_EDITOR_ZOOM`
- [x] Mock bridge defaults and set/get behavior
- [x] Vitest

## Task 3: Desktop zoom IPC

- [x] `zoom-ipc.ts` load/save `editorZoomPercent`
- [x] Register in `main.ts`, expose in `preload.ts`
- [x] Vitest with temp userData

## Task 4: Mobile bridge persistence

- [x] `native-bridge.ts` get/set using `janus-settings`
- [x] Vitest merge behavior

## Task 5: Apply zoom in editor UI

- [x] `editor-zoom.ts` apply CSS variable on shell
- [x] Load zoom in `render-editor.ts`
- [x] `editor.css` use `--editor-page-zoom`
- [x] Vitest

## Task 6: Settings control + catalogs

- [x] Zoom `<select>` in `render-settings.ts`
- [x] `settings.editorZoom` keys in `en` + `es`
- [x] Vitest

## Task 7: Editor keyboard shortcuts

- [ ] Document keydown handler (in/out/reset, skip `<select>`)
- [ ] Vitest

## Task 8: Desktop View menu

- [ ] `zoom-menu.ts` Application menu + `webContents.send`
- [ ] Preload forwards to callback; editor subscribes
- [ ] Vitest smoke for menu template / channel
