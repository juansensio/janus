# Implementation Plan: library (slice 1b — Neo-inspired shelf visual)

**Source spec:** `docs/specs/SPEC-library.md` — **Slice 1b** (Neo-inspired shelf visual)  
**Archived:** `tasks/archive/library/` (slice 1 CRUD complete)

## Overview

Reskin the existing bookshelf **without** changing bridge, domain, or on-disk format. `packages/ui` gains dark Neo-like chrome (gold spaced **Janus** wordmark), one horizontal **BOOKS** row with cover-style cards (2:3, palette from `book.id`), a dashed **+** add tile for `createBook()`, and icon delete with `window.confirm`. Slice 1 CRUD behavior and sort order stay the same.

**Prerequisite:** Slice 1 signed off (`tasks/archive/library/`).

**Not in slice 1b:** Multi-shelf UI, Import, author line, cover images, open-book navigation, custom delete modal, new npm UI/CSS frameworks.

## Architecture decisions

- **Presentation only:** `coverClassForBookId` and all layout live in `packages/ui`; no `services/library` changes.
- **Stylesheet:** `packages/ui/src/styles/shelf.css` imported once from `shell-entry.ts` (Vite bundles CSS into desktop/mobile artifacts).
- **Wordmark:** `createShellLabel()` from `@janus/bridge` inside shelf header (`<h1 class="shelf-wordmark">`); remove duplicate heading from `mount.ts`. System **serif** stack for wordmark; sans for shelf UI (no bundled font).
- **Empty shelf:** Always show add tile; **No books yet** as visually hidden text (`shelf-empty` + screen-reader-only utility) for a11y — no visible empty paragraph.
- **Create:** Add tile only (no header **New book** button); `aria-label` on add tile uses `SHELF_STRINGS.addBook` (rename from `newBook` or alias in strings).
- **Delete:** Icon button (inline SVG minus/bar); visible on **focus** and on **`@media (hover: hover)`** hover; unchanged confirm copy.
- **DOM:** `<header class="shelf-header">`, `<section class="shelf-row">`, `<ul class="shelf-track" role="list">` with `<li role="listitem">` for cards + add tile.
- **Validate guard:** Built JS must still include `Janus` and `data-platform` markers (`scripts/validate-built-ui.ts`); wordmark text satisfies label check.

## Dependency graph

```
Task 1 shelf.css + shell-entry import + base #app dark shell
    → Task 2 cover-palette.ts + unit tests
Task 1 + 2
    → Task 3 render-shelf DOM/chrome/row/cards/add/delete icons
        → Task 4 mount.ts (shelf-only root) + mount.test.ts
Task 3 + 4
    → Task 5 shelf.test.ts alignment + strings
        → Task 6 docs/install-macos.md visual checklist
Task 6
    → Task 7 Human sign-off
```

## Task list

Full acceptance criteria: **`tasks/todo.md`** Tasks **1–7**.

### Phase 1: Foundation
- [x] Task 1: Shelf CSS tokens and global dark shell
- [ ] Task 2: Cover palette helper

### Checkpoint: Foundation
- [ ] `bun run test` green; CSS loads in dev desktop

### Phase 2: Shelf UI
- [ ] Task 3: Neo-style shelf markup and behavior
- [ ] Task 4: Mount wiring (wordmark in shelf only)

### Checkpoint: Shelf visual
- [ ] Create/delete/list unchanged; horizontal row + add tile work in jsdom tests

### Phase 3: Docs and sign-off
- [ ] Task 5: Shelf unit tests
- [ ] Task 6: Install doc — shelf visual checks
- [ ] Task 7: Human sign-off

### Checkpoint: Complete
- [ ] Desktop + Simulator visual pass; `bun run test` && `bun run lint` && `bun run validate:install`

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mount test expected `h1` at root | Low | Task 4 updates `mount.test.ts` to assert shelf wordmark |
| Built UI guard breaks on DOM change | Low | Keep `Janus` string and `data-platform` on `#app` |
| jsdom lacks layout | Low | Test behavior/selectors, not scroll metrics; manual check for overflow |
| Delete icon hard to discover | Med | Focus-visible styles; sr-only labels; manual a11y spot-check |

## Open questions (resolved for build)

| Spec open question | Plan decision |
|--------------------|---------------|
| Empty copy | Visually hidden `shelf-empty`; add tile always visible |
| Header New book | Add tile only |
| Typography | System serif wordmark |
| Delete on hover | Hover + focus-within |

## Human approval

Review **Tasks 1–7** in `tasks/todo.md`, then **`/build`** Task 1.
