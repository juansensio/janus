# Spec: ai-assist slice 2 — model, usage, and limits

> Status: **Deferred** (2026-10-18). Not planned for implementation while Janus uses **ChatGPT subscription (SIWC)** only — writers pay a fixed plan, not on-demand API dollars, so local “spending” and Janus-side limits add little beyond what ChatGPT already enforces (`subscription_sharing_usage_limit_exceeded`, account Usage settings). Revisit if Janus adds **API-key / pay-as-you-go** inference or product needs in-app model choice without billing UX.
>
> Module id `ai-assist` from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). Builds on **ai-assist slice 1** ([`SPEC-ai-assist.md`](SPEC-ai-assist.md)). **Not** indexed in `CAPABILITY-MAP.md` until revived.

## Decision record

| Date | Outcome |
|------|---------|
| 2026-10-18 | User declined slice for now: subscription model makes usage/spend/limits a poor fit. |
| — | **Optional later (separate, smaller spec):** Settings model dropdown only (allowlist + Auto), no ledger or limits — only if writers need explicit model choice before any billing work. |

## Capability map (this initiative)

Single module extension — three concerns ship as one slice because limits depend on usage and model choice affects cost estimates.

| Slice | Responsibility | Depends on |
|-------|----------------|------------|
| ai-assist slice 2 | Model preference (fixed dropdown + Auto), local usage ledger, monthly limits, Settings UI | ai-assist slice 1 |

**Build order:** ai-assist slice 1 (Connect + Write) → **this slice**.

On approval, add a row under `CAPABILITY-MAP.md` for **AI-assist slice 2** pointing here.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. **Desktop only** for model/usage/limit settings (same as slice 1). Mobile bridge methods for these features reject `AI_NOT_SUPPORTED`.
2. **Provider** remains **OpenAI via SIWC** (subscription). No API-key billing integration in this slice.
3. **“Spending”** is **not** returned as USD by OpenAI. The Responses API reports **token usage** on `response.completed` (`usage.input_tokens`, `usage.output_tokens`, `usage.total_tokens`). Janus **records those tokens** and shows an **estimated USD** column using a **maintainer-owned rate table** per model slug (clearly labeled approximate). Subscription invoices stay in ChatGPT; Janus does not scrape ChatGPT billing.
4. **Model dropdown** is a **fixed allowlist** in `services/ai-assist/`. Option **Auto** keeps slice-1 behavior (first `visibility === "list"` slug from `GET /v1/models`). Other options appear only when the signed-in account’s model catalog includes that slug; unavailable options are hidden (not shown disabled), per **curated_auto**.
5. **Limits** use **calendar month** in the user’s **local timezone**, reset at midnight on the 1st. **Hard block:** if a limit would be exceeded, **Write** is rejected before `POST /v1/responses` with `AI_LIMIT_EXCEEDED` and copy in Settings + inline on the comment (same pattern as other `AI_*` errors).
6. Usage ledger and encrypted session stay in **Electron userData** (main process), not in `janus-settings.json` or the library folder. Preferences and limit **thresholds** live in `janus-settings.json`.
7. Domain logic for aggregation, limit checks, and rate estimation lives in `services/ai-assist/`; shell persists ledger and wires IPC.
→ Correct me now or approve and we proceed with these.
```

## Objective

Writers with ChatGPT connected can **choose which OpenAI model** Janus uses for **Write**, see **how much they have used this month** (tokens and estimated cost), and set **monthly caps** so Janus stops calling the provider when they hit their budget.

### User stories

- As a writer, I open **Settings → OpenAI** and pick a model from a **short fixed list** (or **Auto**) without typing slugs.
- As a writer, I see **this month’s** AI usage: number of Writes, input/output/total tokens, and **estimated spend** (approximate USD).
- As a writer, I set one or more **monthly limits** (e.g. max estimated USD and/or max tokens); when exceeded, **Write** is blocked with a clear message until the next calendar month or I raise the limit.
- As a writer, when I change model, the next **Write** uses that model (or Auto resolves at request time).

### Acceptance criteria

**Model**

- Settings shows a `<select>` for model preference when desktop and connected (or always on desktop with helper text when not connected: selection saved but Write still requires Connect).
- Options: **Auto** + allowlisted slugs **intersected** with `GET /v1/models` (`visibility === "list"`) when connected; if not connected, show allowlist labels from static catalog copy only (no live `display_name` until Connect).
- Preference persists in `janus-settings.json` as `openAiModel`: `"auto"` or a slug string.
- `writeForComment` passes resolved model into `AiProviderSession.model` (existing field). Auto omits `model` so provider resolves via `fetchListedInferenceModelSlug`.
- Allowlist is one module-owned constant (update when OpenAI SIWC docs add models); tests lock at least two fictional/test slugs.

**Usage**

- After each successful `generateDraft`, main appends one ledger entry: timestamp, model slug used, `input_tokens`, `output_tokens`, `total_tokens`, `estimatedUsdMicros` (integer micro-dollars to avoid float drift).
- Provider/parser extended to return usage from `response.completed` (stream and non-stream paths).
- Settings displays **current calendar month** totals: write count, token sums, estimated USD (formatted, e.g. `$1.23`), and period label (e.g. “October 2026”).
- Ledger survives app restart; corrupt ledger file → empty totals + log warning (do not crash Settings).

**Limits**

- Settings fields (all optional; empty = no limit for that dimension):
  - **Max estimated USD** per calendar month (number, ≥ 0, step 0.01).
  - **Max total tokens** per calendar month (integer, ≥ 0).
  - **Max Write requests** per calendar month (integer, ≥ 0).
- Changing limits persists immediately to `janus-settings.json` under `aiUsageLimits`.
- Before provider call, `checkAiUsageLimits(projectedUsage?)` runs: for Write, project **zero** additional tokens for pre-check, then after success record actuals; **pre-check** compares current month totals + **conservative ceiling** (optional: reject if already over limit without projection). Default rule: **block if `currentMonth >= limit`** for each configured dimension.
- Rejection: `AI_LIMIT_EXCEEDED` with message key for which limit tripped; inline Write error uses `ai.limitExceeded` (+ variant keys if needed).

**Bridge (desktop)**

- `getAiModelSettings(): Promise<{ preference: "auto" | string; options: AiModelOption[] }>` — options from allowlist ∩ account when connected.
- `setAiModelPreference(preference: "auto" | string): Promise<void>` — validate against allowlist.
- `getAiUsageSummary(): Promise<AiUsageSummary>` — month totals + limits + whether blocked.
- `setAiUsageLimits(limits: AiUsageLimits): Promise<void>`.

Mobile: above reject `AI_NOT_SUPPORTED`.

**i18n**

- New keys under `ai.*` and `settings.*` as needed in `en` and `es`.

**Quality**

- `bun run test` and `bun run lint` pass; no live network in CI.

## Tech Stack

- `services/ai-assist/`: `openai-models.ts` (allowlist + catalog types), `usage-ledger.ts` (pure aggregation/limit math), extend `openai-responses-stream.ts` / provider to surface `ResponseUsage`, `rates.ts` (slug → USD per 1M tokens, documented as estimates).
- `packages/bridge`: types + `JanusBridge` methods.
- `apps/desktop/src/ai-*`: persist ledger, IPC, call limit check before Write.
- `packages/ui/src/settings/render-settings.ts`: model select, usage summary, limit inputs (form submit or change handlers consistent with existing Settings patterns).

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

```
bun run test services/ai-assist
bun run test packages/ui/src/settings
```

## Project Structure

```
services/ai-assist/
  openai-models.ts          → allowlist + fetchListedInferenceModelSlug (existing)
  openai-model-catalog.ts   → JANUS_OPENAI_MODEL_ALLOWLIST, resolve options
  usage-ledger.ts           → append entry, month rollup, limit check
  rates.ts                  → estimated USD from tokens × slug rates
  openai-responses-stream.ts → parse usage from response.completed
  openai-codex-provider.ts  → return usage in GenerateDraftResult
  provider.ts               → extend GenerateDraftResult with usage fields

packages/bridge/src/
  janus-settings.ts         → openAiModel, aiUsageLimits
  index.ts                  → bridge types + methods

apps/desktop/src/
  ai-usage-store.ts         → read/write ledger JSON in userData
  ai-ipc.ts                 → new handlers

packages/ui/src/settings/
  render-settings.ts        → model + usage + limits UI
  render-settings.test.ts   → vitest for new controls

docs/specs/SPEC-ai-assist-slice-2.md
```

## Code Style

Match `AGENTS.md`. Stable error codes:

| Code | Meaning |
|------|---------|
| `AI_LIMIT_EXCEEDED` | Monthly Janus limit hit; Write not sent |
| `AI_INVALID_MODEL` | Saved preference not in allowlist |
| (existing `AI_*`) | Unchanged from slice 1 |

Example limit check (domain):

```ts
export type AiUsageLimits = {
  maxEstimatedUsd?: number;
  maxTotalTokens?: number;
  maxWrites?: number;
};

export function wouldExceedLimits(
  month: UsageMonthRollup,
  limits: AiUsageLimits,
): "usd" | "tokens" | "writes" | null {
  if (limits.maxWrites != null && month.writes >= limits.maxWrites) return "writes";
  if (limits.maxTotalTokens != null && month.totalTokens >= limits.maxTotalTokens) return "tokens";
  if (limits.maxEstimatedUsd != null && month.estimatedUsd >= limits.maxEstimatedUsd) return "usd";
  return null;
}
```

Settings UI: errors for invalid limit input stay **inline** under the field (see `docs/ui-modals.md` for dialog patterns; numeric fields use inline validation, not shelf banner).

## Testing Strategy

- **Domain:** rollup across month boundaries (timezone edge mocked); limit trip cases; rate estimation rounding; SSE parser extracts usage from `response.completed`.
- **Provider:** mock stream ending with `response.completed` + usage; result includes token counts.
- **Bridge mock:** desktop returns summary; mobile `AI_NOT_SUPPORTED`.
- **Settings UI:** change model persists via bridge mock; limit validation; usage summary renders zeros and formatted totals.
- **Desktop IPC:** limit blocks Write without `fetch` call (mock provider not invoked).

## Boundaries

- **Always:** Token totals from API `usage` only; label estimated USD as approximate. Enforce limits in main/domain before network. No secrets in renderer.
- **Ask first:** Syncing limits with ChatGPT account usage API; exporting ledger CSV; per-book usage breakdown; API-key billing path; changing limit period from calendar month.
- **Never:** Store refresh tokens or ledger in `janus-settings.json`. Claim estimated USD is official OpenAI billing. Implement limits only in UI without pre-call enforcement.

## Success Criteria

- Desktop: Connect → pick model (non-Auto) → Write uses that slug; Settings shows month tokens and estimated USD increasing after Write.
- Configure a low monthly USD limit → next Write returns `AI_LIMIT_EXCEEDED` without provider request.
- Auto model unchanged from slice 1 when preference is `auto`.
- CI green without credentials.

## Open Questions

1. **Allowlist contents:** Which slugs ship in v1? **Proposal:** maintain `JANUS_OPENAI_MODEL_ALLOWLIST` with slugs taken from [SIWC models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference.md) at ship time; **Auto** default for new installs.
2. **Rate table:** **Proposal:** single `rates.ts` with USD per 1M input/output tokens per slug; when slug missing, show tokens only and `$—` for estimate (do not block Write).
3. **Pre-check vs post-check:** **Proposal:** hard block when month totals **already** at or over limit before call; successful Write that would push over limit is allowed only if under limit before call (simple, predictable). Alternative: estimate next Write size — **defer** (requires token counting API).
4. **Ledger retention:** **Proposal:** keep 13 rolling months on disk, prune on write; Settings shows current month only in v1.

**Next step after approval:** `/plan` for ai-assist slice 2 (after slice 1 Write polish plan completes or in parallel if independent).
