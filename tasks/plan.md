# Active plan: ai-assist slice 3 — responsive model catalog

**Source spec:** [`docs/specs/SPEC-ai-assist-slice-3-model-catalog-cache.md`](../docs/specs/SPEC-ai-assist-slice-3-model-catalog-cache.md)

**Archived:** zoom slice 2 (complete) → [`tasks/archive/zoom-slice-2/`](archive/zoom-slice-2/)

## Overview

Stop blocking the manuscript editor and Settings on repeated `GET /v1/models` calls. Desktop main keeps a **session-scoped in-memory catalog** (invalidate on disconnect / session clear). `getOpenAiModelSettings` and `setOpenAiModelPreference` read the cache; the editor mounts immediately and hydrates per-comment model dropdowns when options arrive.

## Architecture decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Cache scope | In-memory in `createAiBridgeService` closure | Same lifetime as AI session; no disk persistence (spec boundary) |
| Invalidation | `disconnectOpenAiCodex`, `clearAiSession`, connect replacing session | Session-only TTL per spec open question #1 |
| Domain vs shell | Policy helpers in `services/ai-assist/`; mutable cache + `fetch` in `ai-service.ts` | Invariant 10 — ai-assist owns catalog rules |
| `setOpenAiModelPreference` | Validate against cached `options`; persist settings; **no** second full `resolve` that refetches | Fixes double network on every change |
| Write + Auto | Resolve first listed slug from **same** cache in `writeForComment` before `generateDraft` | Avoids provider’s extra `/v1/models` when settings path already warmed cache |
| Editor UI | `createManuscriptEditor` with `["auto"]` initially; `setOpenAiModelOptions(slugs)` + chrome refresh | Spec: paint manuscript before catalog IPC returns |
| Bridge API | Unchanged `OpenAiModelSettings` | YAGNI — cache makes existing methods fast |

## Dependency graph

```
openai-model-catalog-cache (domain helpers)
        │
        ├── ai-service: cache + invalidate + slim setPreference
        │         │
        │         └── writeForComment uses cached slugs for auto
        │
        └── manuscript-editor: mutable model options
                  │
                  └── render-editor: async hydrate after mount
```

Build order: domain helpers → desktop cache (settings path fast) → Write shares cache → non-blocking editor UI → ship gate.

## Task list

### Phase 1: Catalog cache (main)

- [x] Task 1: Domain catalog cache helpers + tests
- [ ] Task 2: Wire cache in `ai-service` + call-count tests

**Checkpoint:** Second `getOpenAiModelSettings` and `setOpenAiModelPreference` do not call `/v1/models` when cache warm; disconnect clears cache.

### Phase 2: Write path

- [ ] Task 3: Auto Write uses session catalog (no redundant models fetch)

**Checkpoint:** `ai-service` / domain tests show Write with auto does not hit `/v1/models` when catalog already populated.

### Phase 3: Non-blocking editor

- [ ] Task 4: Editor async model options (`manuscript-editor` + `render-editor` + tests)

**Checkpoint:** Test with delayed `getOpenAiModelSettings`: editor field exists before mock resolves.

### Phase 4: Ship

- [ ] Task 5: Full `bun run test` + `bun run lint`; update `tasks/queue.md` row when slice ships

**Checkpoint:** All spec success criteria checked; ready for PR.

## Risks and mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stale catalog if OpenAI adds models mid-session | Low | Accepted per spec; session-only invalidation |
| First open after connect still one slow fetch | Med | Editor no longer waits; Settings keeps loading state on dropdown only |
| Comment `<select>` options stale after async hydrate | Med | `setOpenAiModelOptions` rebuilds options on all comment node views |
| Provider instance `cachedModelSlug` diverges from catalog | Low | Task 3 passes explicit `model` from shell when auto + cache hit |

## Open questions (resolved for build)

- **TTL:** Session-only (disconnect / clear session).
- **Cold cache UI:** Loading on model row only; editor not blocked.
- **Write auto:** Share session catalog in `writeForComment`.
