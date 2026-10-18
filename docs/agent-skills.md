# Using agent skills in Cursor

Janus follows the [Cursor setup](https://github.com/addyosmani/agent-skills/blob/main/docs/cursor-setup.md) for [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills). Skills are workflows the agent reads when a task matches them. Rules are the short policies that stay on in every chat.

## What is installed

```text
.cursor/
├── rules/
│   ├── agent-skills.mdc       # always on: route through project skills
│   └── agents-constraints.mdc # always on: Janus constraints
└── skills/
    └── <skill-name>/SKILL.md  # one workflow per folder
skills-lock.json               # which upstream skills were installed
```

Cursor loads `.cursor/skills/`. That directory is the copy the agent sees. Upstream lives at [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills); editing only the GitHub repo does not change this project.

`AGENTS.md` repeats the same constraints as `agents-constraints.mdc`. Both are loaded, so that text is in context twice.

## A normal chat

You do not name a skill file. Describe the work.

1. The always-on rule tells the agent to open `.cursor/skills/using-agent-skills/SKILL.md` and pick the workflow for the phase (clarify, plan, build, test, review, ship).
2. The agent reads that skill’s `SKILL.md` and follows it, including its verification step.
3. If the skill points at a `reference.md` or `references/` file in its own folder, the agent opens that too.

A feature might run several skills in sequence. A bug fix is usually shorter: find the cause, prove the fix with a test, then review.

Name a skill when you want that workflow and the agent is drifting: “Use test-driven-development” or “follow code-review-and-quality”. Say the name in plain text. Do not attach the `SKILL.md` with `/`. Attaching it can fail the rest of that chat ([#494](https://github.com/addyosmani/agent-skills/issues/494)). Start a new chat if that happens.

## Updating

From the repo root, reinstall from upstream:

```bash
npx skills add addyosmani/agent-skills
```

That refreshes `.cursor/skills/` and `skills-lock.json`. Commit both so the team shares the same workflows.

The skills CLI copies each skill folder. It does not copy the repo-level `references/` directory those skills link to (`definition-of-done.md`, security and performance checklists, and others). Those paths (`../../references/...`) are missing here. Skill-local files, such as `security-and-hardening/references/`, are present. To get the shared checklists, clone [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) and copy its `references/` directory to `.cursor/references/`.
