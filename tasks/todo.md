# Library module — slice 1

**Source spec:** `docs/specs/SPEC-library.md` (approved 2026-10-18)  
**Plan:** `tasks/plan.md`  
**Archived:** `tasks/archive/shell/`

Sizing: **S** = 1–2 files, **M** = 3–5 files.

**Out of scope:** open book → manuscript, i18n (`languages`), rename UI, custom delete modal.

---

## Task 1: `@janus/library` domain package

**Description:** Add `services/library/` workspace package (`@janus/library`): `titles.ts` (`allocateUntitledTitle`), `book-manifest.ts` (`parseManifest`, `serializeManifest`, version 1 schema), `index.ts` (`sortBooksForShelf`, `validateBookId`, `libraryBooksDir`, public types). Root `package.json` workspaces include `services/*`. Vitest discovers `services/**/*.test.ts`. Colocated `library.test.ts` covers title allocation, sort tie-break (`createdAt` then `id`), manifest errors, id validation (`..`, slashes).

**Acceptance criteria:**
- [x] No Electron, Capacitor, DOM, or `fs` imports in `services/library/`
- [x] Unit tests cover corrupt manifest parse failures and skip-policy helpers if extracted
- [x] `bun run test` passes

**Verification:**
- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** None (shell complete)

**Files likely touched:** `package.json`, `services/library/package.json`, `services/library/index.ts`, `services/library/titles.ts`, `services/library/book-manifest.ts`, `services/library/library.test.ts`, `vitest.config.ts` (if needed)

**Estimated scope:** M

---

## Task 2: Extend `JanusBridge` contract

**Description:** Add `BookSummary` type and async `listBooks()`, `createBook()`, `deleteBook(id: string)` to `@janus/bridge` `JanusBridge`. Document error `code` convention. Update all Vitest mocks with minimal async stubs so the suite stays green.

**Acceptance criteria:**
- [x] UI and shells import types from `@janus/bridge` only (not from `services/library` in `packages/ui`)
- [x] `bun run test` and `bun run lint` pass

**Verification:**
- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** Task 1

**Files likely touched:** `packages/bridge/src/index.ts`, various `*.test.ts` mocks

**Estimated scope:** S

---

## Task 3: Desktop library IPC and filesystem adapter

**Description:** Implement library bridge methods on desktop: `libraryRoot` under `app.getPath("userData")`, use `@janus/library` for manifests, titles, paths, sort. `ipcMain.handle` + preload `invoke` wrappers on `window.janus`. `listBooks` skips corrupt entries; `deleteBook` throws `BOOK_NOT_FOUND` when missing; `createBook` writes UUID dir + `book.json`. Vitest for pure helpers and error mapping.

**Acceptance criteria:**
- [x] Preload uses `contextBridge`; no Node `fs` in preload
- [x] create/list/delete round-trip on temp dir via tests
- [x] `bun run dev:desktop` and `desktop:prod` still open without bridge errors

**Verification:**
- [x] `bun run test`
- [x] `bun run lint`

**Dependencies:** Tasks 1, 2

**Files likely touched:** `apps/desktop/package.json`, `apps/desktop/src/preload.ts`, `apps/desktop/src/main.ts`, `apps/desktop/src/library-ipc.ts`, `apps/desktop/src/library-ipc.test.ts`

**Estimated scope:** M

---

## Task 4: Mobile Capacitor filesystem adapter

**Description:** Add pinned `@capacitor/filesystem` to `apps/mobile`. Implement `listBooks`, `createBook`, `deleteBook` on mobile `JanusBridge` using app data directory and domain manifest helpers. Extend `native-bridge.test.ts`.

**Acceptance criteria:**
- [x] Mobile bridge methods match desktop semantics
- [x] Default `capacitor.config.ts` has no permanent dev `server.url`
- [x] `bun run test` green

**Verification:**
- [x] `bun run test`
- [ ] Manual Simulator after Task 5

**Dependencies:** Tasks 1, 2

**Files likely touched:** `apps/mobile/package.json`, `apps/mobile/src/native-bridge.ts`, `apps/mobile/src/library-fs.ts`, `apps/mobile/src/native-bridge.test.ts`

**Estimated scope:** M

---

## Task 5: Bookshelf UI and mount wiring

**Description:** Add `packages/ui/src/shelf/`: empty state, **New book**, card grid with title + delete; `window.confirm` with spec English strings; bridge list/create/delete; `data-platform` on `#app`. Wire mount/bootstrap to shelf. Vitest with mocked bridge.

**Acceptance criteria:**
- [x] No title/sort/manifest logic in UI beyond display and confirm copy
- [x] Cards are not navigation links (slice 1)
- [x] `bun run build:ui` succeeds; shelf visible in `dev:desktop` and `desktop:prod`

**Verification:**
- [x] `bun run test`
- [x] `bun run lint`
- [ ] Manual: create/delete; quit and reopen — persistence

**Dependencies:** Tasks 2, 3, 4

**Files likely touched:** `packages/ui/src/mount.ts`, `packages/ui/src/shelf/*`, `packages/ui/src/shelf.test.ts`, `packages/ui/src/bootstrap.ts`, `packages/ui/src/main.test.ts`

**Estimated scope:** M

---

## Task 6: Install doc — library manual checks

**Description:** Add **Library (slice 1)** subsection to `docs/install-macos.md`: empty shelf, New book, Untitled titles, delete confirm, restart persistence on desktop and Simulator. Note `validate:install` remains shell-only.

**Acceptance criteria:**
- [x] Contributor can verify library without reading `tasks/plan.md`
- [x] English UI strings match spec table

**Verification:**
- [x] Manual read-through

**Dependencies:** Task 5

**Files likely touched:** `docs/install-macos.md`

**Estimated scope:** S

---

## Task 7 (optional): Desktop library integration test

**Description:** Vitest (Node, temp dir): create → list → delete one book; assert on-disk layout and sorted list. Skip with documented reason if too costly.

**Acceptance criteria:**
- [x] Test passes locally or skip documented

**Verification:**
- [x] `bun run test`

**Dependencies:** Task 3

**Files likely touched:** `apps/desktop/src/library-ipc.test.ts` or `tests/integration/library-desktop.test.ts`

**Estimated scope:** S

---

## Task 8: Library slice 1 sign-off (human)

**Description:** Run install doc library checks on desktop and Simulator. Confirm `bun run validate:install` passes. Mark checkpoints in `tasks/plan.md`.

**Acceptance criteria:**
- [ ] Persistence across restart verified
- [ ] `bun run test` and `bun run lint` green

**Verification:**
- [ ] Manual desktop + Simulator
- [ ] `bun run validate:install`

**Dependencies:** Tasks 5, 6 (7 optional)

**Files likely touched:** `tasks/plan.md`, `tasks/todo.md` (checkpoint checkboxes)

**Estimated scope:** S (human)

---

## Checkpoint: Foundation (after Tasks 1–2)

- [x] Domain and bridge contract tested

## Checkpoint: Adapters (after Tasks 3–4)

- [x] Both shells expose working library bridge methods

## Checkpoint: Complete (after Tasks 5–8)

- [ ] Shelf CRUD on desktop and Simulator; install doc updated
- [ ] Ready for `languages` when `SPEC-languages.md` is approved; open book blocked on `manuscript`
