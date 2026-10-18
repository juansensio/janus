# Implementation Plan: HTML manuscript + AI assist (MVP)

**Status:** Planned 2026-10-18. Tasks: `tasks/todo.md`.

**Source specs:**

- `docs/specs/SPEC-manuscript-slice-2.md` (manuscript HTML, tags, transforms, structured editor)
- `docs/specs/SPEC-ai-assist.md` (OpenAI Codex connect, Write, draft insertion)
- Intent: `docs/intent/ai-assist-mvp.md`

**Archived:** `tasks/archive/desktop-release/` (previous root plan; first `v*` tag push still optional maintainer work).

## Overview

Deliver one **desktop writing MVP**: books persist as **`manuscript.html`** with `janus-*` tags; structured editor with **AI comment** and **draft** blocks; **Accept/Reject** via domain transforms; **Connect OpenAI (Codex)** in-app; **Write** sends full-book context and persists a highlighted draft. Mobile keeps HTML editing; AI bridge methods return `AI_NOT_SUPPORTED`.

Build order: **manuscript slice 2** through checkpoint → **ai-assist slice 1**. Task 1 is an **OAuth spike** (fail fast before heavy UI on a blocked auth path).

## Plan decisions (spec defaults locked for build)

| Topic | Decision |
|--------|----------|
| Editor | **ProseMirror** (approved in manuscript slice 2 spec) |
| Comment body | Single **text content** inside `janus-ai-comment` (no nested `janus-p` in v1) |
| Unknown HTML tags | **Reject load** with `MANUSCRIPT_INVALID` |
| Legacy `.md` | Migrate once to `.html`; **leave** `manuscript.md` on disk after migration |
| Context limit | **512 KiB** manuscript HTML → `AI_CONTEXT_TOO_LARGE` |
| Second Write | **Replace** existing draft for same `comment-id` |
| Draft placement | **Sibling after** the comment node |
| Partial draft on failure | **No** file change on provider error |
| Comment text in prompts | Domain extracts plain text from comment node |

## Current baseline

- `services/manuscript/`: `manuscript.md`, textarea editor in `packages/ui/src/editor/render-editor.ts`, autosave 1s.
- No `services/ai-assist/`, no ProseMirror, no AI bridge methods.
- `languages` slice 1 shipped — new strings under `ai.*` / extended `manuscript.*`.

## Architecture decisions

1. **Schema owner** — All tag rules and transforms in `@janus/manuscript`; `insertOrReplaceDraft`, `acceptAiDraft`, `rejectAiDraft` are pure functions + tests with HTML fixtures.
2. **HTML parsing in domain** — Small parser dependency (e.g. `node-html-parser`) **ask-first on add**; used only from `services/manuscript`, not UI.
3. **ProseMirror schema** — Maps 1:1 to on-disk tags; serialize on autosave produces canonical HTML string passed to `writeManuscript`.
4. **AI domain** — `@janus/ai-assist` builds prompts and calls `fetch` via injected port; **no tokens in domain persistence**.
5. **Desktop shell** — Main process: OAuth `BrowserWindow` or system browser + callback, `safeStorage` for refresh token, IPC for connect/status/write; invokes manuscript transforms after `generateDraft`.
6. **Renderer** — Bridge only; Write/Connect/Accept/Reject call IPC; errors inline in editor (not shelf banner).

## Dependency graph

```
Task 1 OAuth spike (doc + go/no-go)
    │
    ├── Task 2 HTML parse/serialize/validate (domain)
    │       └── Task 3 read/write + .md migration (domain + shell)
    │               └── Task 4 draft transforms + bridge IPC
    │                       └── Task 5 ProseMirror janus-p + autosave
    │                               └── Task 6 comment/draft nodes + styling
    │                                       └── Task 7 Accept/Reject UI
    │
    └── (after checkpoint) Task 8 @janus/ai-assist core + mocks
            └── Task 9 desktop session IPC (mock provider)
                    └── Task 10 Codex provider (per spike)
                            └── Task 11 writeForComment pipeline
                                    └── Task 12 Settings + Write + i18n
                                            └── Task 13 approve specs + manual smoke
```

## Task list (summary)

| # | Title | Delivers |
|---|--------|----------|
| 1 | Codex OAuth spike | ADR or spec amendment: supported auth path for consumer Codex |
| 2 | HTML schema domain | Parse, serialize, empty doc, `MANUSCRIPT_INVALID` |
| 3 | `manuscript.html` I/O + migration | Vertical: legacy `.md` book opens as HTML on disk |
| 4 | Draft transforms + bridge | accept/reject/insertOrReplaceDraft + IPC |
| 5 | ProseMirror paragraphs | Replace textarea; autosave HTML |
| 6 | Comment & draft nodes | Add comment affordance; visual chrome |
| 7 | Accept/Reject in editor | Wired to bridge transforms |
| 8 | ai-assist package | Prompt + provider interface + unit tests |
| 9 | Desktop AI session | Connect/disconnect/status; tokens in main |
| 10 | OpenAI Codex provider | Real HTTP per spike |
| 11 | `writeForComment` | Full generate → insert draft → save |
| 12 | Product UI + i18n | Settings connect, Write, mobile `AI_NOT_SUPPORTED` |
| 13 | Spec approval + manual gate | Mark specs approved; dev Mac Connect+Write smoke |

Details: `tasks/todo.md`.

## Checkpoints

### After Task 1

- [ ] Written spike outcome: proceed, pivot (e.g. API key slice), or pause
- [ ] Human sign-off before Task 10 if spike is negative

### After Tasks 2–4 (domain + bridge)

- [ ] `bun run test services/manuscript` green
- [ ] Migration + transform golden tests pass
- [ ] Mock bridge round-trip accept/reject

### After Tasks 5–7 (manuscript slice 2 UI)

- [ ] `bun run dev:desktop`: open book, type paragraphs, Shelf, reopen — `manuscript.html` on disk
- [ ] Legacy `.md` book migrates once
- [ ] Accept/Reject changes file without hand-editing tags
- [ ] `bun run test` && `bun run lint`

### After Tasks 8–12 (ai-assist)

- [ ] Desktop: Connect → comment → Write → draft on disk → Accept
- [ ] Mobile: editor works; AI calls reject with `AI_NOT_SUPPORTED`
- [ ] CI: no live network; mocked provider tests green

### After Task 13 (MVP done)

- [ ] Both specs status **approved** with date
- [ ] Manual smoke documented in plan archive notes
- [ ] `CAPABILITY-MAP.md` footnotes unchanged or updated if scope shifted

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| No third-party OAuth for ChatGPT/Codex consumer plan | **Blocks** ai-assist | Task 1 spike; stop before Task 10; escalate intent change |
| ProseMirror + custom nodes complexity | High — schedule slip | Tasks 5→6→7 vertical; keep v1 schema minimal (4 tags) |
| Full-book context size / cost | Med | 512 KiB guard; clear error |
| Token security in Electron | High | Main-only storage; never expose refresh token to renderer |
| Autosave vs in-flight Write | Med | Write completes → single write; disable Write while saving or queue |

## Parallelization

- **Task 1** can start immediately; **Tasks 2–3** can proceed in parallel with spike (domain has no OAuth).
- **Do not start Task 10** until Task 1 documents a viable auth path.
- **Tasks 8–9** can start after Task 4 (need `insertOrReplaceDraft` contract); parallel with Tasks 5–7 if two agents, but **Task 11** needs both editor comments and session IPC.

## Out of scope

- Cursor provider, API keys, streaming tokens, chapter-scoped context, RAG, rich formatting toolbar, manuscript slice 1 `.md` editor for new books after migration.
