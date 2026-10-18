# Janus /perf reference

## Dev server

| Variable | Default | Notes |
|----------|---------|--------|
| `JANUS_UI_DEV_PORT` | `5173` | Set in `packages/ui/vite.config.ts` and `scripts/dev-desktop.ts` |

URL: `http://127.0.0.1:<port>/` (Vite serves `index.html` at `/`).

Production-like artifacts: `bun run build:ui` → `dist/ui/` (`index.html`, `mobile.html`, hashed assets).

## UI surfaces (no client-side router)

Navigation is programmatic in `packages/ui/src/mount.ts`:

| Surface | How to reach | DOM hints |
|---------|--------------|-----------|
| **Shelf** | Default after `mountJanusShell` | `.janus-shelf-shell`, `.janus-shelf`, `.shelf-track` |
| **Editor** | Click a book card (shelf `onOpenBook`) | `.janus-editor-shell`, `.janus-editor-host`, manuscript `textarea` |
| **Settings** | Shelf control calling `onOpenSettings` | `.janus-settings-shell`, `.janus-settings-host` |

Back from editor or settings: back control → `showShelf()` (`replaceChildren` on `#app` root).

Deep mode: record one trace or Lighthouse run **per surface** after navigation stabilizes.

## Quick checklist anchors (code)

| Concern | Where to look |
|---------|----------------|
| Autosave interval / dispose | `packages/ui/src/editor/render-editor.ts`, `editor/autosave.ts` |
| i18n load once | `mount.ts` `await bridge.getUiLanguage()` then `initI18n` |
| Shelf layout | `packages/ui/src/styles/shelf.css` (wrap, overflow) |
| Mobile entry | `packages/ui/mobile.html`, `apps/mobile/src/entry.ts` alias |

## Optional Lighthouse (lab)

```bash
mkdir -p tmp
npx lighthouse "http://127.0.0.1:5173/" \
  --output json \
  --output-path ./tmp/lighthouse-shelf.json \
  --only-categories=performance
```

Run with shelf visible (default load). Repeat after opening editor/settings manually or via browser automation.

## Trial Quick audit

See `trial-quick-2026-10-18.md` in this folder for the Phase 1 sign-off report.
