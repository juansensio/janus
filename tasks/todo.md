# Library on-disk improvements

**Plans:** `tasks/plan.md`  
**Specs:** `docs/specs/SPEC-library-root.md` (slice 2 draft), `docs/specs/SPEC-library.md` (slice 1e draft)  
**Archived:** `tasks/archive/library-root-slice-1/`

Sizing: **S** = 1–2 files, **M** = 3–5 files.

---

## Task 1: Library root resolution (settings before dev default)

**Description:** Change `resolveLibraryRoot` precedence: after `JANUS_LIBRARY_ROOT`, use `settings.libraryRoot` **before** `JANUS_DEV` `.janus-library`. Update `library-root.test.ts`. Document in plan; spec update in Task 3.

**Acceptance criteria:**

- [x] Saved `libraryRoot` in `janus-settings.json` is used in dev and prod when env override unset
- [x] `JANUS_LIBRARY_ROOT` still wins when set

**Verification:**

- [x] `bun run test` (`apps/desktop/src/library-root.test.ts`)
- [x] `bun run lint`

**Dependencies:** None

**Files likely touched:** `apps/desktop/src/library-root.ts`, `apps/desktop/src/library-root.test.ts`

**Estimated scope:** S

---

## Task 2: Move library when choosing a new folder

**Description:** Add `move-library-root.ts` (or under `library-root.ts`): `moveLibraryContents(fromRoot, toRoot, fs)` — ensure `toRoot/books` receives all book dirs from `fromRoot/books`; reject if destination `books` exists and is non-empty (`LIBRARY_ROOT_NOT_EMPTY`). Wire `chooseLibraryRoot` IPC: read **current** active root from `getContext().resolved.path`, move contents, then save settings. Add bridge error code. Vitest with temp directories.

**Acceptance criteria:**

- [x] After choose + reload, shelf lists same books from **new** path
- [x] `manuscript.md` files move with book dirs
- [x] Non-empty target `books/` rejects without deleting user data
- [x] Choosing same path as current does not corrupt library

**Verification:**

- [x] `bun run test` (`move-library-root` + `settings-ipc.test.ts`)
- [x] `bun run lint`
- [ ] Manual: `dev:desktop` → Settings → choose new folder → reload → books + files at new location

**Dependencies:** Task 1

**Files likely touched:** `apps/desktop/src/move-library-root.ts`, `apps/desktop/src/move-library-root.test.ts`, `apps/desktop/src/settings-ipc.ts`, `packages/bridge/src/index.ts`, `apps/desktop/src/settings-ipc.test.ts`

**Estimated scope:** M

---

## Task 3: Settings UI + library-root slice 2 docs

**Description:** `render-settings.ts`: show **Choose folder…** for desktop when `source !== "env"` (include `dev-default`). Optional note when `dev-default`: “Saved folder overrides development default after reload.” Add `LIBRARY_ROOT_NOT_EMPTY` user message. Update `SPEC-library-root.md` slice 2 (relocate, precedence, error codes). Update `docs/install-macos.md` Settings steps.

**Acceptance criteria:**

- [x] Choose button visible during `dev:desktop`
- [x] Spec slice 2 documents move-on-choose and new precedence

**Verification:**

- [x] `bun run test` (`packages/ui/src/settings/render-settings.test.ts`)
- [x] `bun run lint`

**Dependencies:** Task 2

**Files likely touched:** `packages/ui/src/settings/render-settings.ts`, `packages/ui/src/settings/strings.ts`, `packages/ui/src/settings/render-settings.test.ts`, `docs/specs/SPEC-library-root.md`, `docs/install-macos.md`

**Estimated scope:** S

---

## Task 4: Book directory naming and resolution (slice 1e)

**Description:** Add `book-directory-name.ts`, `resolveBookDirById`, relax `parseManifest` dir/id match. Tests.

**Acceptance criteria:**

- [x] Titled folder resolves by manifest id
- [x] Safe directory names for unsafe title characters

**Verification:**

- [x] `bun run test` (`services/library`)
- [x] `bun run lint`

**Dependencies:** Task 3 (or parallel after Task 2 — prefer after root slice ships)

**Files likely touched:** `services/library/book-directory-name.ts`, `services/library/book-manifest.ts`, `services/library/index.ts`, tests

**Estimated scope:** M

---

## Task 5: Shelf service title folders + UUID migration

**Description:** Refactor `shelf-service` for title dirnames, rename folder on title change, `migrateLegacyUuidBookDirectories` on list.

**Acceptance criteria:**

- [x] New books use `books/<Title>/`
- [x] UUID folders migrate to titles
- [x] Shelf rename renames folder

**Verification:**

- [x] `bun run test` (shelf-service)
- [ ] Manual: Finder shows title folders

**Dependencies:** Task 4

**Estimated scope:** M

---

## Task 6: Manuscript `resolveBookDirById`

**Description:** Desktop + mobile manuscript adapters use `resolveBookDirById` from `@janus/library`.

**Acceptance criteria:**

- [x] Manuscript read/write works with title-named folders

**Verification:**

- [x] `bun run test` (desktop/mobile manuscript)

**Dependencies:** Task 5

**Estimated scope:** S

---

## Task 7: SPEC-library slice 1e + map footnote

**Description:** Add slice 1e to `SPEC-library.md`; `CAPABILITY-MAP.md` if needed; install doc line on title folders.

**Acceptance criteria:**

- [x] Spec matches implementation

**Verification:**

- [x] `bun run test` && `bun run lint`

**Dependencies:** Task 6

**Estimated scope:** S

---

## Checkpoint: Settings relocate (after Tasks 1–3)

- [ ] Choose visible in dev; move + reload preserves books

## Checkpoint: Title folders (after Tasks 4–6)

- [ ] UUID → title migration; manuscript OK

## Checkpoint: Complete (after Task 7)

- [ ] Docs updated; manual both flows
