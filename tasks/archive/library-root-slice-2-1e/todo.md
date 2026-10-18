# Library on-disk improvements

**Closed:** 2026-10-18 — see `plan.md` for the verification pass.

**Plans:** `plan.md` (this folder)  
**Specs:** `docs/specs/SPEC-library-root.md` (slice 2), `docs/specs/SPEC-library.md` (slice 1e)  
**Archived:** `tasks/archive/library-root-slice-1/`

---

Tasks 1–7: acceptance criteria checked in code; automated tests green.

Manual lines originally on Task 2 (Settings relocate in `dev:desktop`) and Task 5 (Finder title folders):

- Title folders: verified on disk under `.janus-library/books/asd/`.
- Settings relocate: not clicked in Electron this pass; covered by Vitest (`move-library-root`, `settings-ipc`).
- Shelf wrap leftover: tracked as Task 8 on the active languages plan.
