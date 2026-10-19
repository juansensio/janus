# Spec: support-docs

> Status: **Slice 1 approved** (2026-10-19). **Book project:** manuscript plus one free-text support document type (`worldbuilding`). Create, open, switch — no templates. Module id `support-docs` (add to [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md) in a follow-up PR). Depends on shipped **library**, **manuscript** (editor + HTML), and **languages**.

A book is a **project**: the existing manuscript plus optional **support documents** stored as plain UTF-8 files under `support/`. Slice 1 ships exactly one kind, `worldbuilding`. The manuscript editor surface is reused; AI comment UI stays manuscript-only.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Slice 1 adds one support kind: `worldbuilding` → `support/worldbuilding.md` (plain text on disk, not HTML).
2. Opening a book still lands on the **manuscript**; a project nav control switches to worldbuilding when it exists or offers **Create** when it does not.
3. Support docs use the same ProseMirror editor as the manuscript; domain code converts plain ↔ editor HTML on the shell/bridge boundary — not `packages/ui`.
4. No templates: **create** writes an empty file; typed content persists via the same autosave cadence as the manuscript (~1s debounce).
5. `book.json` is unchanged; support docs are discovered by path under `support/` (no manifest index in slice 1).
6. Delete book removes the whole book directory (including `support/`).
7. Desktop and mobile share behavior; nav labels use `languages` catalogs (`en` / `es`).
→ Correct me now or approve and we proceed with these.
```

## Objective

Writers keep worldbuilding notes beside the manuscript in the same book, switch between them without returning to the shelf, and see the same text after relaunch.

### User stories

- As a writer, I open a book and land on the manuscript as today.
- As a writer, I create a worldbuilding document for this book and type free text with autosave.
- As a writer, I switch between manuscript and worldbuilding; each document keeps its own content.
- As a writer, I return to the shelf and reopen the book; both documents are unchanged.

### Success criteria (slice 1)

- On disk: `books/<Title>/support/worldbuilding.md` holds UTF-8 plain text; atomic writes; file absent until explicit **Create** (listing does not create files).
- Bridge: `listSupportDocs(id)`, `createSupportDoc(id, kind)`, `readSupportDoc(id, kind)`, `writeSupportDoc(id, kind, editorHtml)` with stable error codes (`INVALID_SUPPORT_DOC_KIND`, `SUPPORT_DOC_NOT_FOUND`, `SUPPORT_DOC_ALREADY_EXISTS`, `SUPPORT_DOC_READ_FAILED`, `SUPPORT_DOC_WRITE_FAILED`, `SUPPORT_DOC_INVALID`).
- Editor: segmented nav **Manuscript** | **Worldbuilding**; switching flushes pending saves; worldbuilding hides AI comment chrome.
- `services/support-docs/` owns kinds, paths, plain I/O, and plain ↔ editor HTML conversion (paragraph-only subset of manuscript HTML).
- `bun run test`, `bun run lint`, and `e2e/flows/support-docs.spec.ts` pass after implementation.

### Out of scope (slice 1)

- Additional kinds (characters, outline, notes, …), starter templates, side-by-side reference panes, PDF export, AI on support docs.

## Tech stack

Same as Janus (`SPEC-shell.md`): TypeScript (strict), Bun workspaces, Vite UI bundle, Vitest, `@janus/bridge`, vanilla TS in `packages/ui`, Electron (`apps/desktop`) and Capacitor (`apps/mobile`).

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
E2E:         bun run e2e e2e/flows/support-docs.spec.ts
```

Domain-only (after implementation):

```
bun run test services/support-docs
```

## Project structure

```
services/support-docs/
  package.json              → @janus/support-docs
  index.ts
  support-doc-kinds.ts      → kind registry (slice 1: worldbuilding only)
  support-doc-service.ts    → paths, create/list/read/write plain files
  editor-binding.ts         → plain ↔ paragraph-only manuscript HTML
  support-doc.test.ts

packages/bridge/src/
  index.ts                  → SupportDocSummary, JanusBridge methods, error codes
  mock-janus-bridge.ts

packages/ui/src/editor/
  editor-project-nav.ts     → Manuscript | Worldbuilding (+ create affordance)
  render-editor.ts          → doc switch, flush on change, hide AI on support doc

apps/desktop/src/
  support-docs-service.ts   → resolve book dir, delegate to domain
  support-docs-ipc.ts
  main.ts, preload.ts

apps/mobile/src/
  support-docs-service.ts
  native-bridge.ts

e2e/flows/support-docs.spec.ts

docs/specs/SPEC-support-docs.md
```

## Code style

Match `AGENTS.md` and existing domain modules (`services/manuscript/`, `services/library/`):

- Pure TS in `services/support-docs/` — no Electron, Capacitor, `window`, or `packages/ui` imports.
- Atomic writes via temp file + rename (same pattern as `manuscript-service.ts`).
- Bridge errors use stable `code` strings; shells map domain errors to IPC reject values.
- UI forwards events and displays catalog strings; no path logic or plain/HTML conversion in `packages/ui`.

Example public surface (illustrative):

```typescript
export type SupportDocKind = "worldbuilding";

export function createSupportDocService(fs: SupportDocFs) {
    return {
        listSupportDocsForBook(bookDir: string): Promise<SupportDocSummary[]>;
        createSupportDoc(bookDir: string, kind: SupportDocKind): Promise<SupportDocSummary>;
        readSupportDocEditorHtml(bookDir: string, kind: SupportDocKind): Promise<string>;
        writeSupportDocFromEditorHtml(
            bookDir: string,
            kind: SupportDocKind,
            editorHtml: string,
        ): Promise<void>;
    };
}
```

## Testing strategy

| Layer | What | How |
|-------|------|-----|
| Domain | paths, create/list, duplicate create, plain round-trip, reject non-paragraph HTML | Vitest `services/support-docs` |
| Desktop bridge | IPC + book dir resolution | Vitest `apps/desktop/src/support-docs-ipc.test.ts` (mirror manuscript-ipc tests) |
| UI | nav labels, create CTA, switch flushes dirty state | Vitest happy-dom colocated with nav module |
| E2E | create book → create worldbuilding → type → switch to manuscript → shelf → reopen | Playwright `e2e/flows/support-docs.spec.ts` |

## Boundaries

| Always | Ask first | Never |
|--------|-----------|-------|
| One owner: `services/support-docs/` | New support kinds, `book.json` fields, manifest index | Business rules or path logic in `packages/ui` |
| Reuse manuscript editor for typing | Rich embeds, markdown preview mode | AI comment UI on support docs in slice 1 |
| Flush autosave before doc switch | Side-by-side layout | Import `services/*` from UI |
| Localize new strings in `en.json` and `es.json` | Changing on-disk filename convention after ship | Implicit create on `list` or first open |

## Decisions taken (approved 2026-10-19)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bridge wire format | Editor HTML in / out; **plain UTF-8 on disk** | Reuse manuscript autosave path in UI without importing domain in `packages/ui` |
| Paragraph mapping | Reuse legacy `manuscript.md` rules via `migrateLegacyMarkdownToHtml` / paragraph-only blocks | One authoritative paragraph split; single `\n` preserved inside a paragraph |
| Create UX | Inline **Create** when user selects **Worldbuilding** and file is missing | Explicit create; no implicit create on list or first keystroke |
| On-disk path | `support/worldbuilding.md` | Room for more kinds under `support/` later |
| Kind id | `worldbuilding` | Stable bridge key; display name via i18n |
| AI chrome | Manuscript only | Slice 1 scope |
| Manifest / queue | Unchanged in this slice; **CAPABILITY-MAP** and **queue** update deferred to later PR | Orchestrator decision |
| Module boundary | New `@janus/support-docs` | Invariant 10 |
