# Intent: HTML manuscript + AI assist (MVP)

Confirmed 2026-10-18 (interview-me).

## Statement of intent

- **Outcome:** Janus is a local-first book writer where the writer attaches **AI instructions** in the manuscript, presses **Write**, and receives **Codex-generated prose** as a **persisted, highlighted draft** they can **accept, reject, or edit** before it becomes real book text.
- **User:** Solo writer on one machine; the full loop runs **inside Janus** (no copy/paste via Cursor or a CLI).
- **Why now:** Move from a plain `manuscript.md` textarea to an **HTML document** with **Janus custom tags** (comments, AI drafts, future components) rendered differently in the editor.
- **Success:** One **desktop** release with **HTML editor + real OpenAI Codex** (consumer subscription sign-in in-app, not API keys in v1): AI comment → Write (full book as context) → persisted draft tag → Accept / Reject / edit-then-Accept.
- **Constraint:** Janus owns the **JS/network auth path** in Electron; v1 provider is **OpenAI Codex only**; drafts and comments live **on disk** in the book HTML.
- **Out of scope:** Cursor connect; developer API keys; mobile AI; broad agent features beyond comment-and-Write unless the capability map is revised.

## Accept / Reject / Modify

- **Accept:** Draft inner content becomes normal manuscript HTML (e.g. `janus-p`); remove draft wrapper and the triggering **AI comment** tag.
- **Reject:** Remove draft tag; keep comment for retry.
- **Modify:** Edit draft in the highlighted region, then Accept (same as Accept).

## Downstream specs

- `docs/specs/SPEC-manuscript-slice-2.md`
- `docs/specs/SPEC-ai-assist.md`
