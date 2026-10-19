# Job plans (`tasks/jobs/`)

A **job** is one module’s durable folder: `tasks/jobs/<job>/`, where `<job>` is the module id from `docs/specs/SPEC-<job>.md` (for example `zoom`, `autonomous-queue`).

A **slice** is one unit of work on the queue — one row in `tasks/queue.md` — stored as:

```
tasks/jobs/<job>/slice-N/plan.md
tasks/jobs/<job>/slice-N/todo.md
```

After a slice’s pull request **merges**, its `plan.md` and `todo.md` **stay here**. A later slice for the same module adds `slice-N+1` beside older slices. Nothing is moved into `tasks/archive/` for new work.

## Local session

- Root `tasks/plan.md` is a pointer: `Active slice: tasks/jobs/<job>/slice-N/`
- `/build` reads `plan.md` and `todo.md` in that folder (see `.cursor/commands/build.md`).

## Cloud slice jobs

Orchestrated agents write only their assigned `slice-N/` folder on their branch. They do not edit `tasks/queue.md`, root `tasks/plan.md`, or other slices.

Contract: `docs/specs/SPEC-autonomous-queue.md`.
