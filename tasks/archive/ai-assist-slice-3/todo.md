# Active tasks: ai-assist slice 3 — model catalog cache

**Spec:** [`docs/specs/SPEC-ai-assist-slice-3-model-catalog-cache.md`](../docs/specs/SPEC-ai-assist-slice-3-model-catalog-cache.md)

**Archived:** zoom slice 2 → [`tasks/archive/zoom-slice-2/`](archive/zoom-slice-2/)

## Task 1: Domain catalog cache helpers

- [x] Add `services/ai-assist/openai-model-catalog-cache.ts`: cache state type, `invalidateOpenAiModelCatalog`, `readListedSlugsFromCache`, `storeListedSlugsInCache` (or equivalent); session-only — no TTL until product asks
- [x] Export from `services/ai-assist/index.ts` if needed by desktop
- [x] Unit tests: miss → store → hit; invalidate → miss
- [x] Acceptance: pure functions; no `fetch` in domain
- [x] Verify: `bun run test services/ai-assist/openai-model-catalog-cache.test.ts`

**Files:** `services/ai-assist/openai-model-catalog-cache.ts`, `openai-model-catalog-cache.test.ts`, `index.ts`

## Task 2: Desktop `ai-service` session cache

- [x] Hold mutable catalog in `createAiBridgeService`; fetch `/v1/models` only on cache miss when session exists
- [x] `setOpenAiModelPreference`: validate against cached options + persist; return settings **without** refetching catalog
- [x] Invalidate on `disconnectOpenAiCodex`; clear on connect path when session replaced (dev override + SIWC success)
- [x] Extend `ai-service.model.test.ts`: count models fetches — 1st `getOpenAiModelSettings` → 1; 2nd → 0; `setOpenAiModelPreference` → 0 extra; after disconnect → no fetch until connected again
- [x] Verify: `bun run test apps/desktop/src/ai-service.model.test.ts`

**Files:** `apps/desktop/src/ai-service.ts`, `apps/desktop/src/ai-service.model.test.ts`

## Checkpoint (after Task 2)

- [x] Settings model dropdown path is cache-backed in main (manual: change model — brief disable only)
- [x] `bun run test services/ai-assist apps/desktop/src/ai-service.model.test.ts`

## Task 3: Write path shares catalog

- [x] When `resolveWriteModelSlug` yields undefined (auto), set provider `model` from first cached listed slug if present; else existing fetch path
- [x] Optional: warm cache on first `getOpenAiModelSettings` so Write rarely cold-misses
- [x] Acceptance: with warm cache, `writeForComment` mock flow does not call `/v1/models`
- [x] Verify: extend `ai-service` test or focused test with delayed models + write mock

**Files:** `apps/desktop/src/ai-service.ts`, tests as above

## Task 4: Non-blocking editor model options

- [x] `ManuscriptEditor`: `setOpenAiModelOptions(options: string[])` updates shared list and rebuilds each comment model `<select>` (keep “use default” option + current value)
- [x] `render-editor.ts`: call `createManuscriptEditor` immediately after manuscript load (with `["auto"]`); `void` async `getOpenAiModelSettings` → `setOpenAiModelOptions`
- [x] Vitest: editor mount / field content before delayed bridge resolves; options appear after resolve
- [x] Verify: `bun run test packages/ui/src/editor/`; `bun run test packages/ui/src/settings/render-settings-model.test.ts`

**Files:** `packages/ui/src/editor/manuscript-editor.ts`, `manuscript-editor.test.ts`, `render-editor.ts` (+ test if added)

## Task 5: Ship gate

- [x] `bun run test` and `bun run lint` green
- [x] Spec success criteria in `SPEC-ai-assist-slice-3-model-catalog-cache.md` satisfied
- [x] Add/update `tasks/queue.md` row for slice 3 (`spec-approved` → `in-progress` → `done` when merged)
- [x] Optional one-line note in `CAPABILITY-MAP.md` under ai-assist (per spec)

**Files:** `tasks/queue.md`, `CAPABILITY-MAP.md` (if doing map note)

## Checkpoint (after Task 5)

- [x] Connected desktop: open book — text visible without waiting on models API (test-backed)
- [x] At most one models list fetch per connect session under normal navigation
- [x] Ready for PR / human review
