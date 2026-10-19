# Plan: Autonomous queue — slice 1

**Source spec:** `docs/specs/SPEC-autonomous-queue.md`  
**Job:** `tasks/jobs/autonomous-queue/`  
**Archived:** `tasks/archive/ai-assist-slice-3/` (previous idle root plan)

## Goal

Ship the markdown-only workflow so a Grok bot can launch parallel cloud-agent slice jobs from `tasks/queue.md`, while local `/spec`, `/plan`, and `/build` share the same queue and keep durable slice plans under `tasks/jobs/<job>/slice-N/`.

## Dependency graph

```
Spec approved (human)
    │
    ├── tasks/queue.md + jobs/README + archive/README
    │
    ├── janus-planning.mdc (jobs/slices, pointer)
    │       │
    │       └── plan.md + build.md commands (read slice path)
    │
    ├── janus-autonomy.mdc (orchestrator vs slice job)
    │
    └── janus-queue skill (checklist, fill, release, examples)
            │
            └── queue.md + spec.md commands (link to skill)
                    │
                    └── Verification walk (skill examples, no drift)
```

Build order is top to bottom. Rules and skills before commands that reference them. Do not add scripts, packages, or product code.

## Risks

| Risk | Mitigation |
|------|------------|
| Launch checklist duplicated in rules and commands | Single home in `janus-queue`; elsewhere only “read the skill” |
| Local `/build` breaks while pointer model lands | Task 4 updates `build.md` to resolve `Active slice:` from root `tasks/plan.md` |
| Old `spec-approved`-only prose remains | Task 8 grep + checklist in success criteria |

## Checkpoints

**After tasks 1–3:** Queue table and planning rule match the spec’s `Needs behavior` and status meanings.

**After tasks 4–6:** An agent reading only `.cursor/` and `tasks/queue.md` can run orchestrator wave + `Orchestrator-Job` brief without contradicting files.

**After task 8:** All success criteria in the spec are ticked; `bun run test` and `bun run lint` unchanged (no new code).

## Out of scope (slice 1)

- Grok bot implementation outside the repo
- Migrating existing `tasks/archive/*` into `tasks/jobs/`
- Product modules from ROADMAP ideas
- Changing `CAPABILITY-MAP.md`
