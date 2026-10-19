# Spec: Autonomous queue

> Status: **Approved** (2026-10-19).  
> **Not a CAPABILITY-MAP module.** Agent workflow only. Markdown, skills, and Cursor commands. No source code, scripts, or tests are added for this workflow.  
> Intent: confirmed in chat on 2026-10-19 (save to `docs/intent/autonomous-queue.md` only if asked).

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. The Grok bot and the Cursor cloud-agent API live outside this repo. This spec is the contract they follow. It does not add an X client, a cloud-agent SDK, or a daemon.
2. "Behavior exists" means that row's pull request is merged to the default branch. An open pull request is not enough.
3. "Dangerous or important" is the closed list in Boundaries. Ordinary uncertainty is written down and the job continues.
4. Local step-by-step use stays. `/spec`, `/plan`, `/build`, `/review`, and `/ship` still work when you run them yourself. The same `tasks/queue.md` is the list for both you and the bot. A local `/spec` or `/plan` writes that row and marks it `local`, so the bot does not launch it. The unattended gates change only when the prompt carries `Orchestrator-Job:`.
5. Saying stop means the bot launches nothing further. Jobs already running finish to a pull request or a needs-decision draft.
6. File overlap is not a dependency. Two independent jobs may edit the same area. You resolve the merge in the morning.
7. The launch checklist lives once, in `.cursor/skills/janus-queue/SKILL.md`. Commands and rules point at that skill. They do not restate the checklist.
8. `.cursor/rules/*.mdc` stay in scope. They are markdown the bots already follow. Leaving the old autonomy rule in place would keep the single-row, human-approval loop.
9. `tasks/archive/` stays the history of plans already finished. This spec does not move those folders. New slices stay under `tasks/jobs/<job>/` after they merge, so the job can be opened later and given another slice.
→ Correct these on review, or approve and we proceed with them.
```

## Objective

You already have a local cycle (spec, plan, build, review, ship) and a queue. A cloud agent today picks the single first `spec-approved` row, writes the shared `tasks/plan.md`, and stops for spec, plan, and ambiguity gates. That cannot run all night, in parallel, with you reviewing pull requests in the morning.

This spec adds the missing contract so a Grok bot can walk `tasks/queue.md`, launch one cloud-agent job per ready row, and leave pull requests for you. Bots read and edit markdown. They do not get a program that decides the launch set for them.

### User stories

- As you, away from the keyboard, the bot launches every queue row that does not need another row's behavior, and it does not start a row whose behavior is still only an open pull request.
- As you, in the morning, each finished job is one pull request. You were pinged only when the job hit the dangerous-or-important list.
- As you, when you ask, the bot updates the queue from the roadmap, from a gap assessment, or by asking what you want. A running job never adds rows.
- As you, at the keyboard, `/spec` and `/plan` update the same queue the bot reads, mark the row `local`, and write that slice under its job. The bot does not take that row unless you release it.
- As you, later, you open `tasks/jobs/<job>/` and add a slice. Earlier slice plans stay in that folder. Nothing is moved to `tasks/archive/`.

### Gaps in the current setup

| Current behavior | Where | Missing |
|---|---|---|
| One shared plan, then a new folder under `tasks/archive/` per slice | `.cursor/rules/janus-planning.mdc`, `tasks/archive/README.md`, `.cursor/commands/plan.md`, `.cursor/commands/build.md` | A job is `tasks/jobs/<job>/`. Each slice is a subfolder that stays after merge. A later slice is added beside it. Root `tasks/plan.md` only points at the local slice. |
| Launch only the first `spec-approved` row | `tasks/queue.md`, `.cursor/rules/janus-autonomy.mdc`, `.cursor/skills/janus-queue/SKILL.md` | The skill's launch checklist. `spec-approved` is not required. |
| Human sets `spec-approved` before plan or build | `tasks/queue.md` "How humans approve work", autonomy work selection | An `Orchestrator-Job` writes a spec when the row has none, and continues when it judges the spec and plan solid. |
| `/build auto` waits for plan approval | `.cursor/commands/build.md` step 4 | That wait is skipped only for `Orchestrator-Job`. A local `/build auto` still waits. |
| Ambiguous spec or uncovered product choice stops the run | `janus-autonomy.mdc` stop conditions, `/build auto` step 6 | Ordinary uncertainty is recorded in the plan and the pull request. The job stops only for the dangerous-or-important list. |
| `done` means acceptance criteria met and the plan archived, which can happen before merge | `janus-autonomy.mdc` verification | `done` means the pull request is merged. `pr-open` means waiting for your review. A dependent row waits for `done`. |
| Build order is a single column. Nothing records behavior dependence | `tasks/queue.md` capability table | A `Needs behavior` column. Empty means the row may run beside others. A value cites another row's Module / slice cell. |
| The worker picks its own next row | `janus-autonomy.mdc` work selection | The bot assigns one row in the job brief. The job does not select or launch another row. |
| A job is expected to edit queue status itself | autonomy "update `tasks/queue.md` status" | Jobs do not edit `tasks/queue.md`. The orchestrator bot refreshes status in a queue-only pull request, then applies the checklist. |
| `/queue` adds only a row you named, and will not read `ROADMAP.md` unless you name the idea | `janus-queue` skill | `/queue fill`, only from a message you send, using one of the three sources below. |
| No launch checklist | — | One checklist and the worked examples, in the queue skill. |
| No job brief | — | The brief template in this spec. The bot copies it into the cloud agent prompt. |
| `/spec` and `/plan` do not write the queue | `.cursor/commands/spec.md`, `.cursor/commands/plan.md` | A local `/spec` upserts a `spec-draft` row marked `local`. A local `/plan` sets that row to `in-progress`, keeps `local`, and writes `tasks/jobs/<job>/<slice>/`. |

## Tech stack

| Piece | Choice |
|---|---|
| Queue | `tasks/queue.md` |
| Job plans | `tasks/jobs/<job>/<slice>/plan.md` and `todo.md`, kept after the slice merges |
| Launch rule | `.cursor/skills/janus-queue/SKILL.md` |
| Commands | `.cursor/commands/queue.md`, `spec.md`, `plan.md`, `build.md` |
| Rules | `.cursor/rules/janus-autonomy.mdc`, `.cursor/rules/janus-planning.mdc` |
| Job prompt | Brief in this spec; the bot lives outside the repo |
| Code | None. No script, no test file, no product change |

Product jobs still follow the existing `/build` command, including `bun run test` and `bun run lint`, when they implement a product slice. That command already exists. This spec does not add a runner for the queue.

## Commands

The bot does not run a launch script. Before each wave it follows `.cursor/skills/janus-queue/SKILL.md`:

1. Read open pull requests, merged pull requests, and cloud agents it already started.
2. Refresh status in `tasks/queue.md` on a queue-only branch: `running`, `pr-open`, `needs-decision`, or `done`. Open that as a pull request that touches no other file. Leave a `local` or `in-progress` row alone unless that row already has a pull request, in which case set `pr-open` and clear `local`.
3. Apply the launch checklist. Launch one cloud agent per row the checklist returns.

A capability row is launched only when all of these are true:

- It is in the capability table, not the ROADMAP ideas table.
- Status is `idea`, `spec-draft`, or `spec-approved`.
- Notes is not `local`.
- `Needs behavior` is empty, or every named row has status `done`.
- The named behavior row exists. If it does not, the bot stops and asks you. It does not guess.

`running`, `in-progress`, `pr-open`, `needs-decision`, and `done` are never launched.

### Local session

`/spec` and `/plan` in your Cursor session write the queue in the same turn. They do not start a cloud job.

| You run | Queue write |
|---|---|
| `/spec` for a module that has no capability row | Append one row: status `spec-draft`, Spec path set, Notes `local` |
| `/spec` for a row already on the queue | Set Spec path, status `spec-draft`, Notes `local`. Leave `Needs behavior` as it is |
| `/plan` | Set that row to `in-progress`. Keep Notes `local`. Write `tasks/jobs/<job>/<slice>/plan.md` and `todo.md`. Point root `tasks/plan.md` at that folder |

`/queue release <row>` clears Notes and sets status to `spec-draft`. The next bot wave may launch it. Until you release, the row is yours, including a spec you have not planned yet.

`/queue` gains these modes:

| Invocation | Mode |
|---|---|
| `/queue fill from roadmap` | Add idea rows for `ROADMAP.md` entries that have no queue row |
| `/queue fill gaps` | Add idea rows for capability-map work that has no queue row and no shipped spec slice |
| `/queue fill` | Ask what you want, then add those rows |
| `/queue release <row>` | Clear `local` and set status to `spec-draft` so the bot may launch it |

Anything else keeps today's list, add, and remove behavior.

## Jobs and slices

A job is one durable folder, named by module id: `tasks/jobs/zoom/`. A slice is a subfolder: `tasks/jobs/zoom/slice-1/`. The queue still has one row per slice. The job is what you open later.

```
tasks/jobs/zoom/
  slice-1/plan.md
  slice-1/todo.md
  slice-2/plan.md
  slice-2/todo.md
```

`zoom — slice 2` uses job `zoom` and folder `slice-2`. The module id is the `<module-id>` in `docs/specs/SPEC-<module-id>.md`. The slice folder is `slice-N`, where N is the number in the queue cell.

Adding a slice does not create a job and does not rename or edit an older slice folder. `/spec` or `/plan` for a module that already has `tasks/jobs/<job>/` adds the next slice there. The next N is one greater than the highest `slice-N` in that folder. If the folder does not exist yet, the first slice is `slice-1` and the queue cell is `<module> — slice 1`.

When a slice's pull request merges, its `plan.md` and `todo.md` stay in the job. `/plan` does not move them to `tasks/archive/`. `tasks/archive/` is unchanged history.

Root `tasks/plan.md` is only a pointer while you are in a local session:

```markdown
Active slice: tasks/jobs/zoom/slice-2/
```

`/build` reads `plan.md` and `todo.md` in that folder. It does not keep a second copy of the plan. A cloud job writes the same slice folder on its branch and does not change other slice folders.

## Project structure

```
tasks/queue.md                              → one row per slice: Needs behavior, status
tasks/jobs/<job>/slice-N/plan.md            → that slice's plan, kept after merge
tasks/jobs/<job>/slice-N/todo.md            → that slice's tasks, kept after merge
tasks/plan.md                               → pointer to your local active slice
tasks/archive/                              → history already stored; do not add to it
.cursor/skills/janus-queue/SKILL.md         → checklist, examples, fill, job and slice rules
.cursor/commands/queue.md                   → /queue fill, /queue release
.cursor/commands/spec.md                    → local /spec upserts a local queue row
.cursor/commands/build.md                   → reads the slice the root pointer names; skips plan approval only for Orchestrator-Job
.cursor/commands/plan.md                    → adds a slice under the job; does not archive it
.cursor/rules/janus-autonomy.mdc            → points at the skill; job does not pick the next row
.cursor/rules/janus-planning.mdc            → slices stay in the job; archive is history
tasks/archive/README.md                     → says new slices are not archived here
```

Do not add a module row to `CAPABILITY-MAP.md`. Do not add a file under `scripts/`, `services/`, `packages/`, or `apps/`.

## Code style

There is no source code. The style is the markdown a bot copies.

Queue capability table. The ideas table stays separate and is never launched.

```markdown
| Order | Module / slice | Status | Spec | Needs behavior | Notes |
|------:|----------------|--------|------|----------------|-------|
| 18 | side panels | idea | — | | — |
| 19 | comments panel | idea | — | side panels | — |
```

`Needs behavior` is empty or the exact Module / slice text of another capability row. It is not a file path and not an Order number.

Every job prompt starts with this brief, with the row filled in:

```text
Orchestrator-Job: side panels
Spec: —
Needs behavior: (none)

Run spec, plan, build, review, and ship for this slice only.
Write the plan to tasks/jobs/side-panels/slice-1/.
Do not edit other slice folders, tasks/archive/, or tasks/queue.md.
Do not launch another row.
If you judge the spec and plan solid, continue.
Record ordinary uncertainty in the plan and the pull request.
Stop and ask only for a dangerous or important decision from the spec's list.
Open one pull request. Do not merge.
```

Pull request body, first lines, exact keys:

```text
Queue-Row: side panels
Job-Status: pr-open
Uncertainty: none
Needs-Decision: none
```

`Job-Status` is `pr-open` or `needs-decision`. A needs-decision stop still pushes the branch and opens a draft pull request so the question is still there in the morning.

The queue-status pull request changes only status cells in `tasks/queue.md`.

## Testing strategy

No new test code. The skill carries worked examples. A reviewer, or a later bot, walks them against the checklist. The checklist and the examples are the same section of `janus-queue`, so they cannot drift apart.

Examples the skill must include:

- Two capability rows, empty `Needs behavior`, status `idea` → launch both, table order.
- Comments panel needs side panels, side panels is `pr-open` → launch neither of those two. An independent third row with status `idea` is launched.
- Comments panel needs side panels, side panels is `done` → launch comments panel.
- A row in `running`, `in-progress`, `pr-open`, `needs-decision`, or `done` → do not launch it.
- Status `spec-draft` with Notes `local` → do not launch it.
- The same row after `/queue release` → launch it when its behavior dependencies are `done`.
- `Needs behavior` names a missing row → stop and ask. Do not launch.
- A ROADMAP ideas row → do not launch.
- `tasks/jobs/zoom/slice-1/` exists and that row is `done`. Planning `zoom — slice 2` creates `tasks/jobs/zoom/slice-2/` and does not change `slice-1/` or `tasks/archive/`.

Product slices a job builds still use the existing `/build` checks (`bun run test`, `bun run lint`). This spec does not add a queue test command.

## Boundaries

- **Always:** Apply the launch checklist in `janus-queue` and launch only those rows. One slice, one queue row, one branch, one pull request. Write that slice under its existing job folder when the job already exists. Record ordinary uncertainty in the plan and the pull request body. Treat `done` on the needed slice as the only satisfied dependency. Leave local `/plan` and `/build auto` plan-approval in place when the prompt has no `Orchestrator-Job:` line.
- **Ask first:** The dangerous-or-important list, and nothing else. That list is: a breaking change to a shipped bridge, on-disk book format, or settings file; an irreversible data migration; deleting user data; secrets or credentials; release automation or tags; a dependency major upgrade. Also ask when `Needs behavior` names a row that is not in the capability table. Record the question in `Needs-Decision` and open a draft pull request.
- **Never:** Add a script, package, or test to implement this workflow. Merge pull requests. Push to the default branch. Edit `tasks/queue.md` from a slice job. Launch a row the checklist does not allow, including a row marked `local` or `in-progress`. Launch a second job for a row that is `running`, `in-progress`, `pr-open`, or `needs-decision`. Treat shared files as a dependency. Add queue rows from a slice job or from `ROADMAP.md` during an unattended run. Set `spec-approved` from a slice job. Clear `local` from a slice job. Move a new slice into `tasks/archive/`. Edit an older slice folder while adding a later slice. Weaken tests, lint, or CI to finish a product slice.

`/queue fill` runs only when your message asks for it. It appends `idea` rows. It does not mark them `spec-approved` and does not start jobs.

## Success criteria

- `janus-queue` contains the launch checklist and every worked example in Testing strategy. Commands and rules link to that skill instead of copying the checklist.
- An `Orchestrator-Job` prompt is specified, and `build.md` skips the plan-approval wait only when that line is present.
- `janus-planning.mdc` states that a slice lives at `tasks/jobs/<job>/slice-N/` and stays there after merge. Root `tasks/plan.md` is a pointer to the local slice. New work is not copied into `tasks/archive/`.
- `janus-autonomy.mdc` states that an orchestrated job does not choose the next row, does not require `spec-approved`, records ordinary uncertainty, and stops only for the dangerous-or-important list.
- `tasks/queue.md` documents `Needs behavior` and the statuses `running`, `pr-open`, `needs-decision`, and `done` (merged).
- `janus-queue` describes `/queue fill` and `/queue release`, and refuses both from an `Orchestrator-Job`.
- Local `/spec` upserts a `spec-draft` row with Notes `local`. Local `/plan` sets that row to `in-progress` and writes `tasks/jobs/<job>/slice-N/`. Neither starts a cloud job.
- A later slice for the same module is a new queue row and a new `slice-N` folder inside the existing job. `slice-1` is still there to read.
- The diff for this work is markdown only: `tasks/`, `.cursor/skills/`, `.cursor/commands/`, `.cursor/rules/`, and this spec.
- The existing zoom row is unchanged until you merge its open pull request or ask for a queue edit. This spec does not rewrite shipped history.

## Open questions

None. The assumptions section is the review gate.
