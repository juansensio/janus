# Spec: ai-assist slice 3 — responsive model catalog

> Status: **Approved** (2026-10-19). Module id `ai-assist` from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). Builds on **ai-assist slice 1** ([`SPEC-ai-assist.md`](SPEC-ai-assist.md)). Does not change Write, OAuth, or manuscript transforms.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Slowness is caused by synchronous `GET https://api.openai.com/v1/models` on every `getOpenAiModelSettings` / `setOpenAiModelPreference` call when a session exists (`apps/desktop/src/ai-service.ts` → `fetchListedModelSlugs`), plus the editor awaiting that IPC before `createManuscriptEditor` (`packages/ui/src/editor/render-editor.ts`).
2. Writers want the **account model list** in Settings and per-comment overrides, but the list changes rarely during a session — **one fetch per connect session** (until disconnect or auth failure) is acceptable.
3. Cache lives in the **desktop main process** (same place as AI session). Domain (`services/ai-assist/`) owns cache **policy** (TTL, invalidation rules, build options from slugs); shell owns the **mutable cache instance** and network fetch.
4. Mobile remains unchanged (`AI_NOT_SUPPORTED` / stub bridge).
5. No new bridge methods in v1 unless split is cleaner — prefer making existing `getOpenAiModelSettings` / `setOpenAiModelPreference` fast via cache; optional `refresh` flag is **out of scope** unless review demands explicit “Reload models”.
→ Correct me now or approve and we proceed with these.
```

## Objective

When OpenAI is **connected**, the manuscript editor and Settings stay as responsive as when disconnected. The OpenAI **models list** is loaded **once per connected session** (not on every screen open or preference change).

### User stories

- As a writer with OpenAI connected, I open a book and see my manuscript text **immediately** after the file loads from disk — not after a network round-trip to list models.
- As a writer, I open Settings and the model dropdown populates quickly; changing the default model **does not** trigger a full list reload or long disabled state.
- As a writer, I disconnect OpenAI; model options fall back to **`auto` only** without errors. After I connect again, the list refreshes **once**.

### Reframed success criteria

| Scenario | Target (dev desktop, normal network) | Verify |
|----------|----------------------------------------|--------|
| Open book (connected) | Editor visible (title + field) within **150 ms** after `readManuscript` resolves; no wait on models API | Test with mocked 2 s models latency: manuscript paint before mock resolves |
| Settings: first open while connected | Dropdown usable within **one** models API call per session | Count `fetch` to `/v1/models` in IPC test |
| Settings: change default model | Select disabled only for local persist (**&lt; 300 ms** in tests with instant FS); **zero** extra models API calls | IPC / service unit test |
| Disconnect / reconnect | Cache cleared on disconnect; exactly **one** models fetch after reconnect | Service test |
| Not connected | `getOpenAiModelSettings` returns `{ preference, options: ["auto"] }` without network | Existing behavior preserved |

## Tech stack

- `services/ai-assist/`: catalog cache helper(s) next to `openai-model-catalog.ts` / `openai-models.ts` (injectable clock for TTL tests).
- `apps/desktop/src/ai-service.ts`: session-scoped cache, wire invalidation on `connectOpenAiCodex`, `disconnectOpenAiCodex`, `clearAiSession` paths, auth failures that clear session.
- `packages/ui/src/editor/render-editor.ts`: **do not block** editor mount on `getOpenAiModelSettings` (load options asynchronously after mount when needed).
- `packages/ui/src/editor/manuscript-editor.ts`: way to update comment model `<select>` options when async catalog arrives (e.g. mutable options + chrome refresh), without re-parsing the document.

Unchanged: bridge type `OpenAiModelSettings`, SIWC, Write, `resolveWriteModelSlug` / `fetchListedInferenceModelSlug` for **auto** at write time (may share cache for slugs list to avoid duplicate fetch on Write — **same session cache**, not a second ad-hoc fetch in `resolveOpenAiModelSettings` only).

## Commands

```
Install:     bun install
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

Focused tests:

```
bun run test apps/desktop/src/ai-service.model.test.ts
bun run test services/ai-assist/openai-model-catalog.test.ts
bun run test packages/ui/src/editor/
bun run test packages/ui/src/settings/render-settings-model.test.ts
```

## Project structure

```
services/ai-assist/
  openai-model-catalog-cache.ts   → cache get/set/invalidate, optional TTL
  openai-model-catalog-cache.test.ts

apps/desktop/src/
  ai-service.ts                   → use cache in resolveOpenAiModelSettings; slim setOpenAiModelPreference

packages/ui/src/editor/
  render-editor.ts                → mount editor first; async model options
  manuscript-editor.ts            → update model options on existing comment chrome
```

## Code style

Match `AGENTS.md`. Cache policy in `services/ai-assist/`; no `fetch` in `packages/ui`. Example shape:

```ts
export type OpenAiModelCatalogCache = {
  slugs: string[] | null;
  fetchedAt: number;
};

export function shouldRefreshCatalog(
  cache: OpenAiModelCatalogCache | null,
  now: number,
  maxAgeMs: number,
): boolean;
```

Shell invalidates on disconnect and when session is cleared; **no** business rules in renderers.

## Testing strategy

- **Domain:** cache hit/miss, TTL expiry, invalidate → `shouldRefreshCatalog` and `buildOpenAiModelOptions` integration.
- **Desktop `ai-service`:** mock `fetchListedModelSlugs` / `fetchImpl`; assert call count: first `getOpenAiModelSettings` → 1 call; second → 0; after `disconnectOpenAiCodex` → 0 until connect; `setOpenAiModelPreference` → 0 additional list fetches when cache warm.
- **UI:** `render-editor` (or manuscript-editor) test: editor mounts with initial HTML before delayed `getOpenAiModelSettings` resolves; model row eventually includes cached options.
- **Settings:** existing model tests still pass; optional assertion that `setOpenAiModelPreference` does not replace all `<option>` elements from a full reload (behavioral: options length unchanged when only preference changes).
- **CI:** no live OpenAI network.

## Boundaries

- **Always:** One authoritative models list per connected session in main; editor/settings must not each trigger independent fetches. Run `bun run test` and `bun run lint` before sign-off.
- **Ask first:** Persisting catalog to disk across restarts; user-visible “Refresh models” control; changing TTL beyond session scope; new bridge methods that duplicate settings shape.
- **Never:** Block manuscript render on OpenAI models API. Refetch models on every `setOpenAiModelPreference`. Move catalog fetching into `packages/ui` or renderer.

## Success criteria (ship)

- [x] Connected desktop: open book → text visible without waiting on models API (verified by test with delayed mock).
- [x] Settings model change does not refetch `/v1/models` when cache is warm.
- [x] At most one models list fetch per connect session under normal navigation (settings open, book open, preference change).
- [x] Disconnect clears cache; reconnect fetches once.
- [x] `bun run test` and `bun run lint` pass.

## Open questions

1. **TTL:** Session-only invalidation (disconnect/auth clear) vs additional **e.g. 24 h** TTL while still connected? **Proposal:** session-only for slice 3; add TTL only if OpenAI adds models mid-session often.
2. **Cold cache on first Settings open after connect:** Show `auto` + loading state vs block dropdown until first fetch? **Proposal:** fetch once on first `getOpenAiModelSettings` after connect (still one call), show loading only in Settings/editor model row — not on whole editor.
3. **Write with `auto`:** `fetchListedInferenceModelSlug` may still call API if cache empty — **Proposal:** share same cached slugs array; Write path reads cache before network.

## Capability map

No new module id. Optional one-line note under **ai-assist** in `CAPABILITY-MAP.md` after approval: “slice 3 — cached model catalog, non-blocking editor.”

## Next step after approval

`/plan` → queue row `ai-assist — slice 3 (model catalog cache)` as `spec-approved` → `/build`.
