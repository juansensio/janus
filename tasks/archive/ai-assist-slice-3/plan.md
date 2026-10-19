# Active plan: ai-assist slice 3 — responsive model catalog

**Source spec:** [`docs/specs/SPEC-ai-assist-slice-3-model-catalog-cache.md`](../../docs/specs/SPEC-ai-assist-slice-3-model-catalog-cache.md)

**Archived:** zoom slice 2 (complete) → [`tasks/archive/zoom-slice-2/`](../zoom-slice-2/)

## Overview

Stop blocking the manuscript editor and Settings on repeated `GET /v1/models` calls. Desktop main keeps a **session-scoped in-memory catalog** (invalidate on disconnect / session clear). `getOpenAiModelSettings` and `setOpenAiModelPreference` read the cache; the editor mounts immediately and hydrates per-comment model dropdowns when options arrive.

## Task list

### Phase 1: Catalog cache (main)

- [x] Task 1: Domain catalog cache helpers + tests
- [x] Task 2: Wire cache in `ai-service` + call-count tests

### Phase 2: Write path

- [x] Task 3: Auto Write uses session catalog (no redundant models fetch)

### Phase 3: Non-blocking editor

- [x] Task 4: Editor async model options (`manuscript-editor` + `render-editor` + tests)

### Phase 4: Ship

- [x] Task 5: Full `bun run test` + `bun run lint`; queue + capability map

**Status:** Complete (2026-10-19).
