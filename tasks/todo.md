# Active tasks: zoom slice 1

**Spec:** [`docs/specs/SPEC-zoom.md`](../docs/specs/SPEC-zoom.md)

## Task 1: Domain `@janus/zoom` and settings normalization

- [x] Add `services/zoom` with levels, normalize, step in/out/reset
- [x] Extend `JanusSettings` / `normalizeJanusSettings` with `editorZoomPercent`
- [x] Update `CAPABILITY-MAP.md` with `zoom` module row
- [x] Vitest for domain + normalize

## Task 2: Bridge contract and mock

- [ ] `getEditorZoom` / `setEditorZoom` on `JanusBridge` + `INVALID_EDITOR_ZOOM`
- [ ] Mock bridge defaults and set/get behavior
- [ ] Vitest

## Task 3: Desktop zoom IPC

- [ ] `zoom-ipc.ts` load/save `editorZoomPercent`
- [ ] Register in `main.ts`, expose in `preload.ts`
- [ ] Vitest with temp userData

## Task 4: Mobile bridge persistence

- [ ] `native-bridge.ts` get/set using `janus-settings`
- [ ] Vitest merge behavior

## Task 5: Apply zoom in editor UI

- [ ] `editor-zoom.ts` apply CSS variable on shell
- [ ] Load zoom in `render-editor.ts`
- [ ] `editor.css` use `--editor-page-zoom`
- [ ] Vitest

## Task 6: Settings control + catalogs

- [ ] Zoom `<select>` in `render-settings.ts`
- [ ] `settings.editorZoom` keys in `en` + `es`
- [ ] Vitest

## Task 7: Editor keyboard shortcuts

- [ ] Document keydown handler (in/out/reset, skip `<select>`)
- [ ] Vitest

## Task 8: Desktop View menu

- [ ] `zoom-menu.ts` Application menu + `webContents.send`
- [ ] Preload forwards to callback; editor subscribes
- [ ] Vitest smoke for menu template / channel
