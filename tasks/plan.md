# Implementation Plan: library (slice 1d — wrapping shelf track)

**Source spec:** `docs/specs/SPEC-library.md` — **Slice 1d** (wrap track; supersedes slice 1b horizontal scroll)  
**Archived:** `tasks/archive/library-slice-1c/` (slice 1c book naming)

## Overview

The shelf track is a non-wrapping flex row with `overflow-x: auto`, so extra books scroll off the right edge. Change it so cards and the dashed **+** tile **wrap within the available width**. Every book stays visible without horizontal scrolling; only the **page** may scroll vertically. Presentation-only in `packages/ui`; no bridge or domain changes.

**Prerequisites:** Slice 1c (naming) complete.

## Architecture decisions

- **Spec override:** Slice 1b assumption 9 and horizontal-scroll acceptance criteria are superseded by slice 1d (wrap + Y-only overflow).
- **CSS in `.shelf-track`:** `flex-wrap: wrap`, no horizontal overflow scroll; remove horizontal scrollbar styles.
- **Narrow viewports:** `flex: 0 1 var(--shelf-card-width)` and `max-width: 100%` on `.shelf-card` and `.shelf-add` so a single card can shrink instead of clipping.
- **DOM:** Unchanged (`render-shelf.ts`).

## Dependency graph

```
Task 1: shelf.css wrap + shrink + shelf-styles.test.ts contract
    → Task 2: SPEC slice 1d + install-macos.md + archive README
```

## Task list

Full acceptance criteria: **`tasks/todo.md`** Tasks **1–2**.

### Phase 1: Layout
- [x] Task 1: Wrap `.shelf-track`; shrink cards on narrow widths; drop x-scrollbar styles

### Checkpoint: Layout
- [x] CSS contract test green; manual desktop with enough books for multiple rows

### Phase 2: Source of truth
- [ ] Task 2: Slice 1d in SPEC-library.md; install doc scroll step; archive README row

### Checkpoint: Complete
- [ ] `bun run test` && `bun run lint`
- [ ] Manual: no horizontal scroll; all books visible; vertical scroll only when needed

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `overflow-x: hidden` clips covers | Med | `flex-shrink` + `max-width: 100%` on cards and add tile |
| jsdom cannot prove wrap | Low | CSS source contract + manual check |

## Out of scope

Multi-shelf rows, bridge/domain, card size redesign.

## Human approval

`/build` Task 1 first.
