---
name: janus-queue
description: Guides agents through listing, adding, and removing rows in tasks/queue.md for /queue. Use when the user runs /queue, asks what is queued, or wants to add or remove a module, slice, or roadmap idea from the Janus work queue.
---

# Janus queue

## Overview

`tasks/queue.md` is the approval list autonomous agents read after `CAPABILITY-MAP.md`. A row must be `spec-approved` before an agent may `/plan` and `/build`. `/queue` shows that list, appends one row, or deletes one row.

This command does not write specs, rewrite `CAPABILITY-MAP.md`, or move status on a row that is already in the file.

## When to Use

- The user runs `/queue`, `/queue list`, `/queue add`, or `/queue remove`
- The user asks what is queued, what to build next, or to add or drop a queue item
- You are about to edit `tasks/queue.md` from a chat request to add or remove work

**When NOT to use:** Implementing a slice (`/build`), writing a spec (`/spec`), or breaking a spec into tasks (`/plan`). Agents that finish a shipped slice still follow `.cursor/rules/janus-autonomy.mdc` for `in-progress` → `done`. Do not use `/queue` to approve your own next slice.

## Process

Read `tasks/queue.md` first. Read `CAPABILITY-MAP.md` and any spec path you will cite. Then follow one mode.

### List (default)

Read-only. Report:

1. **Current queue head** — the first capability-table row in build order whose status is `spec-approved`, or none.
2. Both tables, unchanged: capability modules, then ROADMAP ideas.
3. Counts by status (`idea`, `spec-draft`, `spec-approved`, `in-progress`, `done`).
4. Drift, each item named:
   - Spec file contains `Status: **Approved**` but its queue row is not `spec-approved`
   - Queue row names a spec path that is not a file
   - Module id in the `CAPABILITY-MAP.md` table has no queue row whose Module / slice cell mentions that id

Do not add the missing rows. Do not edit the file.

### Add

Append exactly one row. If the request names several items, add the first and list the rest for a later `/queue add`.

Pick the table:

- **Capability modules** — a module or slice that has, or is about to be tied to, `docs/specs/SPEC-*.md`, or that the user calls a build-order item.
- **ROADMAP ideas** — an informal idea with no spec path.

If the table is ambiguous, ask. Do not guess, and do not copy items out of `ROADMAP.md` unless the user named that idea.

Capability row:

| Order | Module / slice | Status | Spec | Notes |
|---|---|---|---|---|

- **Order:** one greater than the highest numeric Order already in the table. Leave existing orders unchanged. Do not assign an order to a row that belongs in the ideas table.
- **Spec:** the path the user gave, or `docs/specs/SPEC-<module-id>.md` when that file exists. Use `—` when no spec file exists.
- **Status:** `idea`, unless the same message names another status from the queue’s status table.
- **`spec-approved`:** only when the user names that status and the spec file contains a line `Status: **Approved**`. Otherwise stop and say what is missing. Do not mark the spec Approved yourself.
- **Notes:** one short clause from the user, or `—`.

Ideas row: `| Area | Idea | Status |` with status `idea` unless the user names `spec-draft`. Do not put `spec-approved`, `in-progress`, or `done` on an idea with no spec.

Then set **Current queue head** (see below) and show the new row.

### Remove

Delete exactly one row from `tasks/queue.md`. Leave the spec file, `tasks/archive/`, and `CAPABILITY-MAP.md` in place.

Match the user’s text to one Module / slice cell or one Idea cell (or one unique Order number). Case-insensitive exact match on that cell. If the text is only a substring and hits more than one row, stop and list the candidates. If it hits none, stop and list the closest cells.

- Status `in-progress`: stop and ask. `tasks/plan.md` and `tasks/todo.md` may still be the live plan.
- Status `done`: say that the row is shipped history, then delete it. The user already asked to remove it.

Then set **Current queue head** and show the deleted row.

### Current queue head

After Add or Remove, replace the head line so it matches the file:

- No `spec-approved` row: `**Current queue head:** none (\`spec-approved\` empty). Run \`/plan\` after the next approval.`
- Otherwise: name the first capability row in ascending Order whose status is `spec-approved`, and its spec path.

Do not change the Active plan line, the status-value table, or the human-approval steps.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The map already describes it, so I'll queue it" | `CAPABILITY-MAP.md` prose is not approval. Add a row only when the user asked to add that item. |
| "The spec is Approved, so I'll set `spec-approved` while adding" | Add defaults to `idea`. `spec-approved` only when the user names that status and the spec line says Approved. |
| "I'll mark the current row `done` via `/queue`" | This command lists, adds, and removes. It does not edit the status of an existing row. |
| "Several library rows match; I'll remove the obvious one" | More than one match means stop and list them. |
| "Removing the row should delete the spec too" | Remove deletes the queue row only. |

## Red Flags

- Writing `tasks/queue.md` during List
- Adding a row the user did not name
- Setting `spec-approved` when the spec lacks `Status: **Approved**`
- Changing status on a row that was already in the file
- Deleting a spec, archive, or capability-map entry as part of Remove
- Removing an `in-progress` row without asking
- Renumbering existing Order values
- Treating `ROADMAP.md` as the queue

## Verification

Before finishing, confirm:

- [ ] Mode was List, Add, or Remove, and List did not write the file
- [ ] Add created one row in one table, with Order only on a new capability row
- [ ] Remove deleted one matched row and left specs, archives, and `CAPABILITY-MAP.md` untouched
- [ ] `spec-approved` was written only with an explicit user status and an Approved spec line
- [ ] **Current queue head** matches the first `spec-approved` capability row, or says none
- [ ] The reply shows the reported tables (List) or the row added or removed (Add, Remove)
