# Implementation Plan: languages slice 1 (interface locale + catalogs)

**Source spec:** `docs/specs/SPEC-languages.md` (slice 1 — **approved 2026-10-18**)

**Archived:** `tasks/archive/library-root-slice-2-1e/`

## Outcome

Shipped `@janus/languages`, bridge `getUiLanguage` / `setUiLanguage`, desktop + mobile `uiLocale` in `janus-settings.json`, UI `t()` across shelf/editor/settings, language picker, `document.documentElement.lang` + editor `lang`. Shelf wrap presentation completed in `packages/ui` (`shelf.css` flex-wrap on track).

## Task list

See **`todo.md`** in this folder. All tasks complete; manual verification: Settings → Español → relaunch persists.
