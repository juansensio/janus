# Capability Map: Janus

| Module id | Responsibility | Depends on |
|---|---|---|
| shell | Monorepo toolchain, Electron desktop, Capacitor mobile, shared UI mount, bridge contract, install journey | — |
| desktop-release | Tag-triggered GitHub Actions macOS build; GitHub Release assets for Electron (no Windows/mobile) | shell |
| languages | Interface strings, and the set of languages a book may be written in. English and Spanish. | shell |
| manuscript | One book: page, chapters, section breaks, autosave to plain files | languages |
| library | Bookshelf: create, open, and arrange books | manuscript |
| ai-assist | A comment on the text, assigned to the AI. A Write button fills that text from the comment. | manuscript |

Build order (full Neo loop): shell → languages → manuscript → library, ai-assist

**Library slice 1** (`docs/specs/SPEC-library.md`, approved): shelf CRUD only — **build after shell**, before `languages` and `manuscript`.

**Manuscript slice 1** (`docs/specs/SPEC-manuscript.md`, approved, shipped 2026-10-18): open book, edit `manuscript.md`, autosave — **build after library slice 1c**; does **not** wait on `languages`. Delivers library “open book” (slice 2 in `SPEC-library.md`).

**Library root slice 1** (`docs/specs/SPEC-library-root.md`, approved 2026-10-18): dev repo-local `.janus-library/` (+ `JANUS_LIBRARY_ROOT`, one-time move from `userData/library`); desktop Settings folder picker + `janus-settings.json`; mobile unchanged.

**Library root slice 2** (same spec): relocate `books/` when choosing a new folder; saved `libraryRoot` wins over dev default; Choose folder in dev.

**Library slice 1e** (`docs/specs/SPEC-library.md`): title-based `books/<Title>/` folders; uuid migration on list; rename moves folder; manuscript resolves by manifest id.

**Languages slice 1** (`docs/specs/SPEC-languages.md`, approved 2026-10-18): interface locale (`en`/`es`), catalogs, Settings language picker (desktop + mobile); persists `uiLocale` in `janus-settings.json`. Does **not** wait on `ai-assist`. Per-book writing language is a later slice.

**Desktop release v1** (`docs/specs/SPEC-desktop-release.md`, approved 2026-10-18): push tag `v*` → macOS workflow → GitHub Release with downloadable Electron app; unsigned; no Windows, iOS, or auto-update. Agent workflow spec: `docs/specs/SPEC-desktop-release-command.md` (`/release` verify/setup — command files not added until implementation).

`library` (full) and `ai-assist` can be specified in parallel after `manuscript` slice 1.

**Module specs** live in `docs/specs/SPEC-<module-id>.md` (for example `docs/specs/SPEC-shell.md`). This map is the index; do not add module specs at the repo root.

**Layering** (`services/`, `packages/bridge`, `packages/ui`, `apps/*`): [`docs/architecture.md`](docs/architecture.md).

## Decisions recorded with this map

- **Bun** for install, scripts, and workspaces; lockfile `bun.lock` is committed.
- **Shared TypeScript core** in `packages/` and `services/<domain>/` (domain modules are pure TS; no Electron/Capacitor/DOM in domain code).
- **Desktop:** Electron (`apps/desktop`). **Mobile:** Capacitor (`apps/mobile`), iOS Simulator as the first mobile gate on Mac.
- **Presentation:** shared web UI in `packages/ui`; shells only implement `JanusBridge` and host the bundle.
- Books will be plain files on disk. No accounts. Local-first.
- The writing loop follows Neo: a shelf, a page, chapters, autosave. The code is original.
- English and Spanish cover the interface and the language of a book. Those are two separate values. The interface language is chosen for the app. The book language is chosen per book. AI writes in the book language.
- AI v1 is only the comment-and-Write action in the table. The writer marks a passage with a comment for the AI, then presses Write, and the model fills that text from the comment. More AI actions require a revision of this map.

**Withdrawn:** Python/Flask local web app on `127.0.0.1:5000` (see git history / prior shell spec if needed).

Left for a later map: restored cut passages, placeholders, outline cards, word goals, import and export, screenplays, generated covers, binding several books into one.
