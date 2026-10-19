# Active plan: zoom slice 1

**Source spec:** [`docs/specs/SPEC-zoom.md`](../../docs/specs/SPEC-zoom.md)

**Archived:** previous idle root plan (no module) → `tasks/archive/idle-pre-zoom/`

## Goal

Persisted manuscript page zoom with domain module, bridge IPC, Settings control, editor shortcuts, and desktop View menu.

## Task order

```
1 domain + settings shape
2 bridge + mock
3 desktop IPC
4 mobile bridge
5 UI apply + editor load
6 settings control + i18n
7 editor keyboard shortcuts
8 desktop View menu + renderer listener
```

## Notes

- Rebuild CAPABILITY-MAP row for `zoom` in Task 1 commit.
- One commit per task in `tasks/todo.md`.
