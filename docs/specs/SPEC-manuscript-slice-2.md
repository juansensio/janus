# Spec: manuscript — slice 2 (HTML)

> Status: **Proposed** (2026-10-18). Module id `manuscript` from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). Depends on shipped **manuscript slice 1**, **languages slice 1**, and **library** open-book flow. **Blocks** `ai-assist` slice 1. Intent: [`docs/intent/ai-assist-mvp.md`](../intent/ai-assist-mvp.md).

Slice 1 (`manuscript.md` textarea) remains documented in [`SPEC-manuscript.md`](SPEC-manuscript.md). This slice **replaces** the on-disk format and editor for new saves; it does not add AI generation (that is `ai-assist`).

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. On disk the canonical file is `manuscript.html` (UTF-8), not `manuscript.md`. Slice 1’s `manuscript.md` is legacy; opening a book migrates once, atomically, then reads/writes HTML only.
2. The document root is `<janus-manuscript version="1">…</janus-manuscript>`. Body prose uses `<janus-p>`. AI-specific tags are defined here; `ai-assist` must not invent parallel formats.
3. Pending AI output is stored as `<janus-ai-draft>` in the same file (autosaved). Rendering (highlight, actions) is presentation; bytes on disk are the source of truth.
4. Domain owns **tag schema**, **parse/validate**, **serialize**, and **document transforms** (accept/reject draft, insert draft). The UI calls bridge methods that delegate to `@janus/manuscript`; it does not implement accept/reject rules in the DOM layer.
5. Editor is **structured** (not a single `<textarea>`). One approved dependency is allowed for slice 2 (see Tech Stack). Mobile and desktop share the same HTML model; AI chrome is desktop-only (`ai-assist`).
6. Autosave interval stays **1s** while dirty; flush on **Shelf** unchanged from slice 1.
7. Book language for AI is still UI locale until per-book language exists; `lang` on the editor root follows resolved UI locale.
→ Correct me now or approve and we proceed with these.
```

## Objective

The writer opens a book and edits an **HTML manuscript** with Janus-specific tags. Normal paragraphs persist as `janus-p`. AI comment and draft tags persist on disk and render with distinct styling. **Accept** and **Reject** on a draft are deterministic file transforms.

### Phased delivery (this slice)

| Phase | Outcome | Depends on |
|--------|---------|------------|
| **Slice 2 — HTML manuscript** (this spec) | `manuscript.html`, migration from `.md`, structured editor, draft accept/reject transforms | manuscript slice 1, languages slice 1 |
| **Later** | Chapters, section breaks, per-book language | `languages` / map |

### User stories

- As a writer, I open a book that only has legacy `manuscript.md` and Janus converts it once to valid HTML without losing my text.
- As a writer, I type paragraphs in the editor and they save to `manuscript.html` as `janus-p` elements.
- As a writer, I see AI comment and draft tags in the document with distinct styling (drafts visually “pending”).
- As a writer, I **Reject** a draft and the draft tag disappears from the file; the comment remains.
- As a writer, I **Accept** a draft and the prose becomes normal `janus-p` (or inline content per schema); comment and draft wrappers are removed.

### Acceptance criteria (slice 2)

- Canonical filename `manuscript.html` beside `book.json`. `MANUSCRIPT_FILENAME` in domain code points to `.html`.
- Missing both `.html` and `.md`: read returns minimal empty document (`<janus-manuscript version="1"></janus-manuscript>`); file created on first save.
- Legacy book with only `manuscript.md`: first open migrates to `manuscript.html` (wrap text in `janus-p`, preserve newlines); after successful migration, slice 1 file may remain on disk but is **not** read again unless migration is rolled back manually.
- Parse rejects malformed HTML with a stable `MANUSCRIPT_INVALID` (or load error) shown in UI; writer can return to shelf.
- `acceptAiDraft(bookId, draftId)` and `rejectAiDraft(bookId, draftId)` (names at implement time) perform exactly the intent rules; idempotent reject on missing draft is safe; accept on missing draft fails with stable code.
- Autosave, flush-on-Shelf, and load failure behavior match slice 1 semantics on the **serialized HTML string**.
- `packages/ui` does not import `services/*`.
- `bun run test` and `bun run lint` pass.

## On-disk format

```
<libraryRoot>/books/<bookId>/
  book.json
  manuscript.html          ← canonical
  manuscript.md            ← legacy; migrated once if present
```

### Tag schema (v1)

| Tag | Purpose | Required attributes |
|-----|---------|---------------------|
| `janus-manuscript` | Document root | `version="1"` |
| `janus-p` | Paragraph body | — |
| `janus-ai-comment` | Instruction for AI | `id` (uuid) |
| `janus-ai-draft` | Pending AI output | `id`, `comment-id` (matches comment) |

- Comment text lives in the element body (escaped HTML text or nested `janus-p` only — pick one in implementation; tests lock the choice).
- Draft body is HTML fragment the writer may edit before Accept; on Accept, domain promotes content to `janus-p` sibling(s) and removes comment + draft nodes.
- Unknown tags: **strip on round-trip** or **reject load** — default **reject load** with `MANUSCRIPT_INVALID` so foreign HTML does not silently corrupt books (document in tests).

### Serialization

- UTF-8, no BOM. Pretty-print optional; round-trip tests use normalized compare.
- Atomic write (temp + rename) same as slice 1.

## Tech Stack

- TypeScript strict, Bun, Vitest, existing Vite UI bundle.
- Domain: extend `services/manuscript/` (`@janus/manuscript`) with HTML parse/serialize/transform (pure TS; use a small HTML parser dependency **ask-first** — e.g. `linkedom` or `node-html-parser` for tests/Node; mobile shell uses same domain).
- Bridge: extend `JanusBridge` — `readManuscript` / `writeManuscript` return **HTML string**; add `acceptAiDraft`, `rejectAiDraft` (or single `applyManuscriptTransform` with typed ops — prefer explicit methods for UI clarity).
- UI: structured editor in `packages/ui/src/editor/` — **ProseMirror** (or equivalent) approved for this slice to map `janus-*` nodes to document nodes and decorations.

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

Domain-focused:

```
bun run test services/manuscript
```

## Project Structure

```
services/manuscript/
  manuscript-service.ts       → read/write filename, migration
  manuscript-html.ts          → schema, parse, serialize
  manuscript-transforms.ts    → accept/reject draft
  manuscript-html.test.ts
  manuscript-transforms.test.ts

packages/bridge/src/index.ts  → bridge methods + error codes

packages/ui/src/editor/       → ProseMirror (or chosen) setup, tag views

apps/desktop/src/             → IPC for new methods
apps/mobile/src/              → same read/write/transform (no AI UI)

docs/specs/SPEC-manuscript-slice-2.md
```

## Code Style

Match `AGENTS.md`. Transforms are pure functions on a parsed document model or AST, not string hacks in the UI.

```ts
export const MANUSCRIPT_FILENAME = "manuscript.html";

export type ManuscriptDocument = {
  version: 1;
  /** Serialized canonical HTML for persistence */
  html: string;
};

export function acceptAiDraft(html: string, draftId: string): string {
  /* throws ManuscriptServiceError with MANUSCRIPT_DRAFT_NOT_FOUND */
}

export function rejectAiDraft(html: string, draftId: string): string {
  /* removes draft; keeps comment */
}
```

## Testing Strategy

- **Domain:** migration `.md` → `.html`; parse/serialize round-trip; accept/reject golden fixtures; invalid unknown tag fails load; Unicode in `janus-p`.
- **Bridge mock:** accept/reject delegate to domain.
- **UI:** open migrated book; typing updates HTML; reject/accept buttons change serialized output (happy-dom + mock bridge).
- **Desktop IPC:** transform methods return updated HTML or error codes.

Manual: legacy book with `manuscript.md` opens as HTML; Accept removes tags as specified.

## Boundaries

- **Always:** Own filename, schema, and transforms in `services/manuscript/`. Run `bun run test` before sign-off. Flush on Shelf. Preserve writer text through migration.
- **Ask first:** Additional `janus-*` tags beyond the four above; changing accept/reject semantics; third-party HTML sanitizer policy; manuscript size limits.
- **Never:** Call AI providers from manuscript module. Import `services/*` from `packages/ui`. Store manuscript in `book.json`.

## Success Criteria

- Books save as `manuscript.html` with `janus-*` tags; legacy `.md` migrates once.
- Accept/Reject match [`docs/intent/ai-assist-mvp.md`](../intent/ai-assist-mvp.md).
- Mobile can open/edit HTML manuscripts without AI controls.
- `bun run test` and `bun run lint` pass.

## Open Questions

1. **Comment body shape:** single text node vs one `janus-p` child — implementer picks one; spec owner confirms on first PR.
2. **ProseMirror vs lighter editor:** default ProseMirror unless you reject during spec approval.
3. **Legacy `manuscript.md` after migration:** delete file on success vs leave orphan — default **leave** (safer rollback).

**Next step after approval:** `/plan` for manuscript slice 2, then `ai-assist` (or combined plan with explicit build order: slice 2 before ai-assist).
