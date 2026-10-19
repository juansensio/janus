# Plan: ai-highlight — slice 1

**Source spec:** `docs/specs/SPEC-ai-highlight.md` (Approved 2026-10-19)  
**Job:** `tasks/jobs/ai-highlight/`  
**Queue row:** 20 — ai-highlight — slice 1

## Goal

Ship desktop **selection → rewrite** using existing AI comment/draft tags and `writeForComment`, with restore on Reject and on delete-before-Write.

## Dependency graph

```
manuscript-html (comment variant + source attrs)
        │
        ├── beginHighlightRewrite + unit tests
        │
        ├── rejectAiDraft + deleteAiComment restore (shared helper)
        │
        ├── ai-assist prompt + writeForComment rewriteSourceText
        │
        ├── bridge + desktop IPC + mobile stub
        │
        ├── editor: selection spans, toolbar, schema round-trip, delete path
        │
        └── e2e flow
```

Build order follows tasks 1 → 6 (vertical slices; each task is testable before the next).

## Risks

| Risk | Mitigation |
|------|------------|
| ProseMirror selection vs block indices drift | Single `selectionToHighlightSpans` helper; unit test with fixture doc |
| Duplicate restore logic reject vs delete | One `restoreRewriteSourceAtComment` in manuscript domain |
| Partial paragraph split edge cases | Golden tests for before/comment/after and multi-`janus-p` |
| UI `deleteAiComment` only in editor today | Extend domain `deleteAiComment` + editor delete handler to use restore path for rewrite |

## Checkpoints

**After task 2:** Manuscript round-trip and restore paths green without UI.

**After task 4:** Bridge contract callable from renderer tests/mocks.

**After task 6:** CI + e2e green; manual gate documented in PR.

## Out of scope (slice 1)

- Preset instruction list; per-selection model override
- Mobile AI; new CAPABILITY-MAP module row
- Changing Accept to merge draft into adjacent paragraph text

## Rollback

Revert branch commits; no migrations. Books with `variant="rewrite"` comments are normal HTML and remain editable if slice is reverted before merge.
