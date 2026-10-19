# Spec: zoom

> Status: **Slice 1 approved** (2026-10-18). **Slice 2 approved** (2026-10-19) — editor zoom bar and page-scale zoom. Module id `zoom` from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). Depends on shipped **shell**, **manuscript** (editor), and **languages** (Settings + catalogs). Slice 1 behavior stays.

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

## Slice 2 — editor zoom bar and page scale

### Assumptions

```
ASSUMPTIONS I'M MAKING:
1. This stays module `zoom`. Shortcuts, View menu, Settings, discrete levels (75–200, default 100), and `editorZoomPercent` persistence from slice 1 stay as they are.
2. The bar is editor-only, pinned to the bottom of the editor viewport, in the shared UI (desktop and mobile). Shelf and Settings chrome do not zoom and do not show the bar.
3. Left to right the bar is: plus, the label `zoom (X%)`, minus. Plus steps in, minus steps out, same steps as Cmd/Ctrl + and Cmd/Ctrl −.
4. The percent is a label. Reset stays Cmd/Ctrl+0 and View → Actual Size.
5. Word-like zoom means the page card’s layout box grows and shrinks with the level (width, padding, title, body, and in-page type). Editor chrome above the page (back, status, errors) stays at 1×. Line breaks at a given window size match the 100% page, because the content box and the type scale by the same factor.
6. The viewport fit used today (`min(34rem, 100% − 2.5rem)`) is the 100% measure, then multiplied by the zoom factor. Above 100% the page may be wider and taller than the area above the bar; that region scrolls on both axes. The page stays centered when it fits. The bar does not scroll away.
7. Scale with `--editor-page-zoom` on layout size and page font-size. Do not use `transform: scale()` (the layout box would stay 100%). Do not use the CSS `zoom` property (slice 1 decision for mobile WebView).
8. At 75% the minus control is disabled. At 200% the plus control is disabled. Both stay visible.
9. The English label shape is `zoom (125%)`. Spanish uses the catalog. Visible plus/minus glyphs are `+` and `−`; accessible names come from the catalogs.
→ Correct these or approve the spec.
```

### Objective

A writer changes page size from a bar at the bottom of the editor and sees the whole page get larger or smaller, the way a page does in Word, while keyboard and menu zoom keep working.

### User stories

- As a writer, I press `+` or `−` on the bottom bar and the manuscript page grows or shrinks, including the paper, not only the letters.
- As a writer, I read the current size as `zoom (X%)` on that bar, and the number updates when I use the bar, the keyboard, or the View menu.
- As a writer, my choice still persists across relaunch, and Settings still sets the same value.

### Acceptance criteria

- While the editor is open, a bar pinned to the bottom shows `+`, `zoom (X%)` with the current percent, and `−`.
- `+` and `−` call the same step as Cmd/Ctrl +/−, persist through `setEditorZoom`, and update the label. At 75% minus is disabled; at 200% plus is disabled.
- Cmd/Ctrl +/−/0 and the desktop View menu update the bar label without a click on the bar.
- At 100%, on a window wide enough for `34rem`, the page card’s border-box width matches slice 1. At 200% on that same window the border-box width is twice the 100% width, body type is twice the 100% size, and a line that fit at 100% still fits. At 75% the page is three-quarters of that 100% width and stays centered.
- Back, save status, and errors do not change size when zoom changes.
- When the scaled page is larger than the area above the bar, the writer can scroll horizontally and vertically to reach it. The bar stays on screen.
- Shelf and Settings layout are unchanged. The Settings zoom control still lists the same levels and stays in sync with the bar.
- `@janus/zoom` remains the only owner of levels, normalize, step, and reset. The bar displays the percent and forwards clicks.
- Labels and button names exist in `en.json` and `es.json`.
- `bun run test` and `bun run lint` pass. The desktop zoom e2e flow covers one bar step and asserts the page box grew.

### Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Control order | `+` then `zoom (X%)` then `−` | Matches the requested bar |
| Percent control | Label only | Reset already exists on the keyboard and View menu |
| What scales | `.editor-page` layout box and type on the page | Word scales the paper; slice 1 only multiplied title and body `font-size` inside a fixed `34rem` card |
| What stays 1× | `.editor-chrome` and the zoom bar | Zoom is the manuscript page, not the app chrome |
| Mechanism | Multiply the 100% width and padding by `--editor-page-zoom`; page font-size uses the same factor | Layout box grows, so line breaks stay stable and the page can scroll |
| Hosts | Shared editor UI | Desktop and mobile both show the bar; pinch stays out of scope |

### Commands

Same as slice 1.

```
bun run test
bun run lint
bun run test services/zoom
bun run e2e e2e/flows/zoom.spec.ts
```

### Project structure

Slice 1 paths stay. Slice 2 touches:

```
packages/ui/src/editor/render-editor.ts   → scrollport + pinned bar
packages/ui/src/editor/editor-zoom.ts     → notify on percent change; bar reads it
packages/ui/src/styles/editor.css         → page width/padding/font-size × factor; bar chrome
services/languages/locales/en.json
services/languages/locales/es.json
e2e/flows/zoom.spec.ts
e2e/helpers/ui.ts                         → read bar percent and page box if needed
```

No new domain module. No new bridge methods.

### Code style

Domain stays free of DOM. The bar is presentation: it shows `getPercent()` and calls `applyDirection`. Example of the CSS contract (100% measure × factor):

```css
.editor-page {
    width: calc(min(34rem, 100% - 2.5rem) * var(--editor-page-zoom, 1));
    max-width: none;
    padding: calc(3.25rem * var(--editor-page-zoom, 1))
        calc(2.75rem * var(--editor-page-zoom, 1))
        calc(3.5rem * var(--editor-page-zoom, 1));
    font-size: calc(1rem * var(--editor-page-zoom, 1));
}
```

In-page type uses `em` (or an equivalent multiple of that page font-size) so it tracks the page. Do not put step arithmetic in the stylesheet or the template.

### Testing strategy

| Area | What | How |
|------|------|-----|
| Domain | Unchanged levels and step | Existing `services/zoom` tests |
| UI | Bar label, disabled ends, shortcut updates the label, page width factor | Vitest happy-dom next to the editor zoom tests |
| e2e | Click `+` once from 100%, bar reads `zoom (110%)`, page box is wider than at 100% | `e2e/flows/zoom.spec.ts` |

### Boundaries

- **Always:** Step and clamp in `@janus/zoom`. One persisted percent shared by bar, shortcuts, menu, and Settings. Localize new strings in both catalogs. Keep slice 1 shortcut and menu behavior.
- **Ask first:** Changing the level set, making the percent a reset button, hiding the bar on mobile, removing the Settings control, pinch-to-zoom, per-book zoom, zooming shelf or Settings.
- **Never:** Scale only `font-size` inside a fixed page box. Use `transform: scale()` as the page size. Store zoom in the book folder. Encode zoom steps in `packages/ui`.

### Success criteria

- From the editor, `+` / `−` and Cmd/Ctrl +/− change one persisted percent, and the bar shows that percent.
- The page card is visibly larger at 200% than at 100% and smaller at 75%, and text does not reflow relative to the 100% page at the same window size.
- Editor chrome above the page stays the same size.
- Tests listed above pass.

### Open questions

None. Approval confirms the assumptions in this section.
