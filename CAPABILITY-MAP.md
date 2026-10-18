# Capability Map: Janus

| Module id | Responsibility | Depends on |
|---|---|---|
| shell | Monorepo toolchain, Electron desktop, Capacitor mobile, shared UI mount, bridge contract, install journey | — |
| desktop-release | Tag-triggered GitHub Actions macOS build; GitHub Release assets for Electron (no Windows/mobile) | shell |
| languages | Interface strings, and the set of languages a book may be written in. English and Spanish. | shell |
| manuscript | One book: page, chapters, section breaks, autosave to plain files | languages |
| library | Bookshelf: create, open, and arrange books | manuscript |
| ai-assist | AI comment in HTML; Write (full book context) → persisted draft; Accept/Reject; OpenAI Codex connect (desktop). | manuscript |

Build order (full Neo loop): shell → languages → manuscript → library, ai-assist

**Library slice 1** (`docs/specs/SPEC-library.md`, approved): shelf CRUD only — **build after shell**, before `languages` and `manuscript`.

**Manuscript slice 1** (`docs/specs/SPEC-manuscript.md`, approved, shipped 2026-10-18): open book, edit `manuscript.md`, autosave — **build after library slice 1c**; does **not** wait on `languages`. Delivers library “open book” (slice 2 in `SPEC-library.md`).

**Library root slice 1** (`docs/specs/SPEC-library-root.md`, approved 2026-10-18): dev repo-local `.janus-library/` (+ `JANUS_LIBRARY_ROOT`, one-time move from `userData/library`); desktop Settings folder picker + `janus-settings.json`; mobile unchanged.

**Library root slice 2** (same spec): relocate `books/` when choosing a new folder; saved `libraryRoot` wins over dev default; Choose folder in dev.

**Library slice 1e** (`docs/specs/SPEC-library.md`): title-based `books/<Title>/` folders; uuid migration on list; rename moves folder; manuscript resolves by manifest id.

**Languages slice 1** (`docs/specs/SPEC-languages.md`, approved 2026-10-18): interface locale (`en`/`es`), catalogs, Settings language picker (desktop + mobile); persists `uiLocale` in `janus-settings.json`. Does **not** wait on `ai-assist`. Per-book writing language is a later slice.

**Desktop release v1** (`docs/specs/SPEC-desktop-release.md`, approved 2026-10-18): push tag `v*` → macOS workflow → GitHub Release (arm64 zip/dmg); ad-hoc signed, **not notarized** — users still need Gatekeeper bypass. Status: [`docs/desktop-release-status.md`](docs/desktop-release-status.md). Agent workflow: `docs/specs/SPEC-desktop-release-command.md`, `/release`.

**Manuscript slice 2** (`docs/specs/SPEC-manuscript-slice-2.md`, proposed 2026-10-18): `manuscript.html`, Janus custom tags (`janus-ai-comment`, `janus-ai-draft`), structured editor, migrate legacy `manuscript.md`, accept/reject draft transforms. **Build before `ai-assist` slice 1.** Mobile edits HTML; no AI UI.

**AI-assist slice 1** (`docs/specs/SPEC-ai-assist.md`, proposed 2026-10-18): desktop Connect OpenAI Codex (consumer subscription, in-app sign-in), Write → draft tag, integrates manuscript transforms. Intent: `docs/intent/ai-assist-mvp.md`. **Blocked on manuscript slice 2** and on OAuth spike (see spec Open Questions).

`library` (full) and `ai-assist` can be specified in parallel after `manuscript` slice 1; **implementation order** for the HTML+AI MVP is manuscript slice 2 → ai-assist slice 1.

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
- AI v1 (proposed spec): comment tag → Write with full-book context → persisted `janus-ai-draft` → Accept/Reject/Modify; OpenAI Codex on desktop via in-app connect (API keys and Cursor connect are later). More AI actions require a map revision.

**Withdrawn:** Python/Flask local web app on `127.0.0.1:5000` (see git history / prior shell spec if needed).

Left for a later map: restored cut passages, placeholders, outline cards, word goals, import and export, screenplays, generated covers, binding several books into one.
