# Spec: zoom

> Status: **Slice 1 approved** (2026-10-18, autonomous). Module id `zoom` from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). Depends on shipped **shell**, **manuscript** (editor), and **languages** (Settings + catalogs).

Writers adjust how large the **manuscript page** appears in the editor. Shelf and Settings chrome keep their default size.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. ROADMAP “Zoom page” means the **book page** in the manuscript editor (`.editor-page`), not whole-app or shelf zoom.
2. Zoom is a **presentation preference** persisted in `janus-settings.json` (`editorZoomPercent`), outside the library tree, same merge rules as `uiLocale`.
3. Discrete levels only (no free-form slider): 75, 90, 100, 110, 125, 150, 175, 200. Default 100. Invalid saved values snap to 100.
4. Zoom applies via a CSS custom property on the editor shell; domain code owns valid levels and stepping — not templates or inline arithmetic in renderers.
5. Desktop gets a **View** menu (Zoom In, Zoom Out, Actual Size) with standard accelerators; menu labels are **English** in slice 1 (menu is rebuilt on launch only). Settings control and editor chrome use localized catalogs.
6. Mobile has Settings control only (no menu). Pinch-to-zoom is out of scope.
7. Keyboard shortcuts work while the editor is open: zoom in/out/reset (Ctrl/Cmd + +/−/0). Shortcuts do not fire when focus is in a `<select>` (e.g. AI model row).
→ Juan delegated approval; proceeding with these.
```

## Objective

A writer opens a book, zooms the page for comfort, and the choice survives relaunch on desktop and mobile.

### User stories

- As a writer, I use keyboard shortcuts or the desktop View menu to make the page larger or smaller without leaving the editor.
- As a writer, I pick a zoom level in Settings and see the editor page at that size the next time I open a book.
- As a writer on mobile, I change zoom in Settings; shelf layout is unchanged.

### Acceptance criteria (slice 1)

- `editorZoomPercent` persists in `janus-settings.json` (desktop `userData`, mobile Capacitor Data). Load/save merges without dropping `libraryRoot`, `uiLocale`, or `openAiModel`.
- Bridge exposes `getEditorZoom()` and `setEditorZoom(percent)` returning `{ percent, levels }`. Invalid `percent` rejects with `INVALID_EDITOR_ZOOM`.
- Opening the editor applies the saved zoom to **only** `.editor-page` (title + ProseMirror field scale together).
- Desktop **View** menu: Zoom In, Zoom Out, Actual Size with accelerators `CmdOrCtrl+=`, `CmdOrCtrl+-`, `CmdOrCtrl+0`. Choosing an item updates zoom when the editor is visible and persists.
- Editor document listener: same three actions when not blocked by `<select>` focus.
- Settings (desktop + mobile): labeled control listing every level (shows `%`); changing it persists and, if the user is on the editor screen, updates immediately (user must re-open book from shelf if they changed zoom from Settings while on shelf — acceptable).
- `services/zoom/` (`@janus/zoom`) is the only owner of level list, normalize, step in/out, and reset.
- `bun run test` and `bun run lint` pass.

## Decisions taken autonomously

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Zoom scope | Manuscript page only | Matches ROADMAP wording and Neo “page” metaphor |
| Level set | 75–200% in eight steps | Browser-like, easy to test |
| CSS mechanism | `--editor-page-zoom` multiplier on `.editor-page` `font-size` | Keeps layout proportional without `zoom` non-standard on mobile WebView |
| Desktop menu language | English labels slice 1 | Avoid rebuilding Electron menu on every `setUiLanguage` |
| Settings on shelf | Persist only; no live shelf preview | YAGNI — zoom is editor-specific |

## Tech Stack

Same as Janus stack (`SPEC-shell.md`): TypeScript, Bun, Vitest, `@janus/bridge`, vanilla UI in `packages/ui`, Electron + Capacitor shells.

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

Domain-only:

```
bun run test services/zoom
```

## Project Structure

```
services/zoom/
  package.json
  index.ts
  editor-zoom.ts
  editor-zoom.test.ts

packages/bridge/src/
  index.ts              → getEditorZoom, setEditorZoom on JanusBridge
  janus-settings.ts     → editorZoomPercent in normalize
  mock-janus-bridge.ts

apps/desktop/src/
  zoom-ipc.ts
  zoom-ipc.test.ts
  zoom-menu.ts          → Application menu + webContents events
  main.ts                 → register IPC + menu
  preload.ts              → bridge methods + zoom menu listener

apps/mobile/src/
  native-bridge.ts        → get/set editor zoom

packages/ui/src/
  editor/editor-zoom.ts   → apply zoom, shortcuts, subscribe menu IPC (desktop)
  editor/render-editor.ts
  settings/render-settings.ts
  styles/editor.css

services/languages/locales/en.json, es.json → settings.editorZoom*
```

## Code Style

Match `AGENTS.md` and `SPEC-languages.md`. Domain module has no Electron, Capacitor, or DOM.

## Testing Strategy

| Area | What | How |
|------|------|-----|
| Domain | normalize, step, bounds | Vitest `services/zoom` |
| Settings file | merge `editorZoomPercent` | Vitest desktop `zoom-ipc`, mobile `janus-settings` |
| Bridge mock | defaults 100 | Vitest |
| UI | apply CSS variable; shortcut steps | Vitest happy-dom in `editor-zoom.test.ts`, settings test |
| Menu | IPC registration smoke | Vitest `zoom-menu.test.ts` optional minimal |

## Boundaries

- **Always:** Step/normalize in `@janus/zoom`. Persist via existing settings helpers. Localize Settings strings in both catalogs.
- **Ask first:** Changing level set, zooming shelf/settings, pinch gestures, per-book zoom.
- **Never:** Business logic in CSS templates beyond reading a variable set from TS. Store zoom inside library folders.
