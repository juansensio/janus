# Tasks: Ship-gate fixes

**Plan:** `tasks/plan.md`  
**Source:** `/ship` NO-GO (2026-10-18) on `main` @ `564f837`  
**Status:** All tasks complete (2026-10-18).

---

## Task 1: Shared unique directory names + safe `createBook`

**Acceptance criteria:**

- [x] `uniqueDirectoryName` is exported from `services/library/` and used by migration + `createBook`
- [x] Creating `"foobar"` then `"foo/bar"` yields two distinct folders
- [x] No regression: normal titles still use `bookDirectoryName(title)` when unused
- [x] `bun run test` and `bun run lint` pass

---

## Task 2: Safe `renameBook` folder moves

**Acceptance criteria:**

- [x] Rename into a colliding sanitized title does not clobber another book
- [x] Existing rename tests still pass; collision rename test added

---

## Task 3: `resolveBookDirById` unit tests

**Acceptance criteria:**

- [x] `services/library/resolve-book-dir.test.ts` with legacy, title, invalid id, not found

---

## Checkpoint: Blockers (after Tasks 1–3)

- [x] All Task 1–3 acceptance criteria checked
- [x] `bun run test` && `bun run lint`

---

## Task 4: Normalize `janus-settings.json` on load

**Acceptance criteria:**

- [x] Invalid types ignored; valid settings unchanged; tests added

---

## Task 5: Test `chooseLibraryRoot` preserves `uiLocale`

**Acceptance criteria:**

- [x] settings-ipc test asserts `uiLocale` in written JSON

---

## Task 6: Deduplicate `formatMessage` through bridge

**Acceptance criteria:**

- [x] UI uses bridge `formatMessage`; README updated

---

## Checkpoint: Hardening + DRY (after Tasks 4–6)

- [x] `bun run test` && `bun run lint` && `bun run build:ui`

---

## Task 7: Manuscript read/write path containment

**Acceptance criteria:**

- [x] Desktop realpath containment + `manuscript-service.test.ts`

---

## Task 8: Spec note + re-ship

**Acceptance criteria:**

- [x] SPEC-library slice 1e documents disambiguation
- [ ] Re-run `/ship` for GO (user)

---

## Checkpoint: Complete

- [x] Tasks 1–7 and SPEC update done
- [x] `bun run test` (200) && `bun run lint` && `bun run build:ui`
