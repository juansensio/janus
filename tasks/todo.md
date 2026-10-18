# Library module — slice 1d (wrapping shelf track)

**Source spec:** `docs/specs/SPEC-library.md` — Slice 1d  
**Plan:** `tasks/plan.md`  
**Archived:** `tasks/archive/library-slice-1c/` (slice 1c book naming)

Sizing: **S** = 1–2 files, **M** = 3–5 files.

**Out of scope:** multi-shelf, bridge/domain, horizontal scroll row.

---

## Task 1: Wrap shelf track layout (CSS)

**Description:** Update `packages/ui/src/styles/shelf.css` so `.shelf-track` uses `flex-wrap: wrap` and does not scroll horizontally (`overflow-x` not `auto`). Remove webkit horizontal scrollbar rules for the track. Allow `.shelf-card` and `.shelf-add` to shrink on very narrow viewports (`flex: 0 1 var(--shelf-card-width)`, `max-width: 100%`, `box-sizing: border-box`). Extend `shelf-styles.test.ts` to assert wrap and no `overflow-x: auto` on `.shelf-track`.

**Acceptance criteria:**

- [x] `.shelf-track` has `flex-wrap: wrap` and no horizontal auto-scroll
- [x] Cards and add tile can shrink below preferred width when viewport is narrower than one card
- [x] CSS contract tests cover wrap layout expectations

**Verification:**

- [x] `bun run test` (packages/ui shelf-styles)
- [x] `bun run lint`
- [ ] Manual: `bun run dev:desktop` — create enough books to exceed one row; no horizontal scrollbar; all cards visible; page scrolls vertically if needed

**Dependencies:** None

**Files likely touched:** `packages/ui/src/styles/shelf.css`, `packages/ui/src/styles/shelf-styles.test.ts`

**Estimated scope:** S

---

## Task 2: Spec and install doc (slice 1d)

**Description:** Add **Slice 1d** section to `docs/specs/SPEC-library.md` documenting wrap behavior and superseding slice 1b horizontal scroll. Update `docs/install-macos.md` step 5 (scroll → wrap). Add `library-slice-1c/` row to `tasks/archive/README.md` if missing.

**Acceptance criteria:**

- [ ] Spec records wrap + vertical-only overflow for the track
- [ ] Install doc matches manual verification steps

**Verification:**

- [ ] `bun run test` && `bun run lint`

**Dependencies:** Task 1

**Files likely touched:** `docs/specs/SPEC-library.md`, `docs/install-macos.md`, `tasks/archive/README.md`

**Estimated scope:** S

---

## Checkpoint: Layout (after Task 1)

- [x] CSS tests green
- [ ] Manual wrap check on desktop

## Checkpoint: Complete (after Task 2)

- [ ] Docs aligned with behavior
- [ ] Full test + lint green
