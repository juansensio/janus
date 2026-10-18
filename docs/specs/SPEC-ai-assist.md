# Spec: ai-assist

> Status: **Proposed** (2026-10-18). Module id `ai-assist` from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). Depends on **manuscript slice 2** (HTML + `janus-ai-comment` / `janus-ai-draft`). Intent: [`docs/intent/ai-assist-mvp.md`](../intent/ai-assist-mvp.md).

Revises capability-map wording for v1: comment → **Write** → persisted **draft** tag → Accept/Reject/Modify (Accept/Reject transforms live in `manuscript`; this module owns **provider connection** and **generation**).

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. **Desktop Electron only** for slice 1 (OAuth window, token storage, outbound HTTPS from main). Mobile manuscripts work; AI UI and bridge methods return `AI_NOT_SUPPORTED` on mobile.
2. **v1 provider** is **OpenAI Codex** via the writer’s **consumer subscription** (option A from intent). No API-key path in this slice. If OpenAI does not expose a supported third-party OAuth for Codex/ChatGPT, slice 1 is **blocked** until a documented official path exists (see Open Questions).
3. Tokens live in the **main process** (Electron `safeStorage` or OS keychain wrapper). Renderer never sees refresh tokens. UI only sees connected/disconnected and error codes.
4. **Context** for Write is the **entire current book HTML** (after load/migration), plus the targeted `janus-ai-comment` by `id`. No RAG, no chapter scoping in v1.
5. Generation **inserts or replaces** a `janus-ai-draft` linked to the comment (`comment-id`). If a draft already exists for that comment, Write **replaces** draft content (confirm in UI copy). Persisted via normal manuscript autosave.
6. Prompt assembly and provider HTTP live in `services/ai-assist/` (pure TS + injectable `fetch`). Shell injects auth headers from stored session.
7. `packages/ui` does not import `services/*`. UI calls bridge: connect, disconnect, status, `writeForComment(bookId, commentId)`.
→ Correct me now or approve and we proceed with these.
```

## Objective

On desktop, the writer connects **OpenAI (Codex)** inside Janus, places an AI comment in the HTML manuscript, presses **Write**, and receives generated prose as a **highlighted, persisted draft** they can edit, **Accept**, or **Reject** (transforms via manuscript slice 2).

### User stories

- As a writer, I open Settings (or editor chrome), **Connect OpenAI**, complete sign-in in a Janus-owned flow, and see **Connected**.
- As a writer, I add a `janus-ai-comment`, press **Write**, and see progress; on success a `janus-ai-draft` appears with distinct styling.
- As a writer, if generation fails, I see a clear error and my manuscript is unchanged except any in-progress draft policy (default: no partial draft on failure).
- As a writer, I **Reject** or **Accept** using controls bound to manuscript transforms (not by hand-editing tags).

### Acceptance criteria (slice 1)

- Bridge: `getAiProviderStatus()`, `connectOpenAiCodex()`, `disconnectOpenAiCodex()`, `writeForComment(bookId, commentId)` (exact names at implement time).
- Mobile: `connect*` / `write*` reject with `AI_NOT_SUPPORTED`; status reports unavailable.
- Connect opens system/browser OAuth or embedded `BrowserWindow` per OpenAI’s supported desktop pattern; on success, status is connected across app restart until disconnect or token expiry.
- `writeForComment` validates book + comment id, builds prompt in `services/ai-assist/`, calls provider, returns updated HTML string (or manuscript service applies patch in main — **one** owner: prefer main calls `insertOrReplaceDraft(html, commentId, draftHtml)` in manuscript domain).
- Full book HTML included in provider request within a documented size guard (e.g. refuse or truncate with `AI_CONTEXT_TOO_LARGE` — default **refuse** with message).
- UI: Write button on or near AI comment; loading state; errors inline (not shelf banner). Draft styling matches intent (highlighted background).
- Settings: Connected / Not connected + Connect / Disconnect for OpenAI.
- Strings added to `en` and `es` catalogs (keys under `ai.*`).
- `bun run test` and `bun run lint` pass.

## Tech Stack

- `services/ai-assist/` (`@janus/ai-assist`): prompt templates, provider adapter interface, OpenAI Codex implementation, unit tests with mocked `fetch`.
- `apps/desktop/src/ai-*`: IPC, OAuth callback handling, token persistence, invokes domain + provider.
- No provider code in `packages/ui` or renderer beyond bridge calls.

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
```

## Project Structure

```
services/ai-assist/
  index.ts
  prompt.ts                 → comment + full manuscript → provider messages
  provider.ts               → AiProvider interface
  openai-codex-provider.ts  → Codex HTTP (auth from shell)
  ai-assist.test.ts

services/manuscript/
  manuscript-transforms.ts  → insertOrReplaceDraft (owned by manuscript)

packages/bridge/src/index.ts
packages/ui/src/editor/     → comment UI, Write, draft chrome, Accept/Reject
apps/desktop/src/           → OAuth, IPC, token store

docs/specs/SPEC-ai-assist.md
```

## Provider contract (domain)

```ts
export type AiProviderSession = {
  provider: "openai-codex";
  accessToken: string; // held in shell, passed per call, not persisted in domain
};

export type GenerateDraftInput = {
  manuscriptHtml: string;
  commentId: string;
  commentText: string;
  /** Resolved UI locale until book language exists */
  locale: string;
};

export type GenerateDraftResult = {
  draftHtml: string; // fragment safe to place inside janus-ai-draft
};

export interface AiProvider {
  generateDraft(
    session: AiProviderSession,
    input: GenerateDraftInput,
  ): Promise<GenerateDraftResult>;
}
```

Shell implements session load/save; domain receives token only as an argument to `generateDraft`.

## Code Style

Match `AGENTS.md`. Stable error codes on `Error`:

| Code | Meaning |
|------|---------|
| `AI_NOT_SUPPORTED` | Mobile or platform without AI |
| `AI_NOT_CONNECTED` | Write without session |
| `AI_COMMENT_NOT_FOUND` | Bad comment id |
| `AI_CONTEXT_TOO_LARGE` | Manuscript over limit |
| `AI_PROVIDER_ERROR` | HTTP / provider failure |
| `AI_AUTH_FAILED` | OAuth or token refresh failed |

## Testing Strategy

- **Domain:** prompt contains comment text and manuscript; mock provider returns draft; error mapping.
- **Manuscript integration tests:** insertOrReplaceDraft + write flow golden HTML.
- **Bridge mock:** desktop paths; mobile `AI_NOT_SUPPORTED`.
- **Desktop:** IPC tests with mocked provider (no live network in CI).
- **Manual gate (pre-release):** real Connect + Write on a dev Mac with your subscription (documented in plan, not CI).

## Boundaries

- **Always:** Keep provider and prompt logic in `services/ai-assist/`. Keep HTML schema and accept/reject in `services/manuscript/`. No secrets in renderer. Run tests before sign-off.
- **Ask first:** Second provider (Cursor); API-key path; streaming tokens to UI; changing context from full-book to selection; CI live integration tests.
- **Never:** Store tokens in `janus-settings.json` plaintext. Send manuscript to provider without connected session. Implement Accept/Reject rules only in CSS/DOM.

## Success Criteria

- Desktop: Connect → comment → Write → persisted draft → Accept/Reject per intent doc.
- Mobile: edit HTML manuscript; no AI entry points.
- CI green without network credentials.

## Open Questions

1. **Consumer subscription OAuth:** Confirm OpenAI’s supported integration for Codex/ChatGPT accounts in third-party desktop apps. **Spike required** before implementation; if no supported path, escalate: revise intent (API key slice) or pause ai-assist.
2. **Draft placement:** Insert draft immediately after comment vs replace selection — default **after comment** as sibling block.
3. **Replace existing draft:** Overwrite on second Write without extra confirm — default **yes** with undo = Reject.
4. **Context limit:** Max bytes for v1 — propose **512 KiB** manuscript HTML; adjust on approval.

**Capability map:** On approval, update `CAPABILITY-MAP.md` ai-assist row and AI v1 bullet to mention draft tags + Accept/Reject.

**Next step after approval:** `/plan` with build order **manuscript slice 2 → ai-assist slice 1** (single MVP milestone per intent).
