# Implementation Plan: library-root (slice 1 — configurable library directory)

**Source spec:** `docs/specs/SPEC-library-root.md` — Slice 1 (approved 2026-10-18)  
**Archived:** `tasks/archive/manuscript-slice-1/`

## Status

All tasks **complete** (2026-10-18). Dev migration from `userData/library` → `.janus-library` included per user request.

### Phase 1–4

- [x] Task 1: Desktop library root resolver and startup wire
- [x] Task 2: Bridge `getLibraryRoot` + read IPC + mobile stub
- [x] Task 3: `chooseLibraryRoot` + picker + persist
- [x] Task 4: Settings UI + shelf entry
- [x] Task 5: Spec approval + install doc

### Checkpoints

- [x] Tests and lint green (147 tests)
- [ ] Optional manual: `desktop:prod` folder pick + reload
