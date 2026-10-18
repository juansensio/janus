# Janus desktop end-to-end tests

Playwright drives the **real Electron app** (`_electron.launch`) against a built UI bundle. Each run uses an isolated temp `user-data` directory and `JANUS_LIBRARY_ROOT`, so your machine’s books and settings are never touched.

## Prerequisites

- [Bun](https://bun.sh) (same as the rest of the repo)
- Electron binary via `bun run ensure:electron` (run automatically by `bun run e2e`)
- **macOS:** run tests from a normal desktop session
- **Linux (CI / cloud agents):** `xvfb-run` is used automatically when `DISPLAY` is unset

Playwright browser downloads are **not** required (Electron only). `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is set by the runner.

## Commands

| Command | Purpose |
|--------|---------|
| `bun run e2e` | Build UI + desktop, then run all flows |
| `bun run e2e -- e2e/flows/zoom.spec.ts` | Run a single flow file |
| `bun run e2e:shots` | Copy `e2e/artifacts/` → `/opt/cursor/artifacts/e2e-screenshots` when that path exists (cloud agents) |

Named screenshots are written under `e2e/artifacts/<flow-slug>/`. That directory is gitignored. On failure, Playwright also keeps a trace under `e2e/test-results/` and the fixture copies `failure.png` + `trace.zip` into the flow artifact folder.

## Layout

```
e2e/
  fixtures.ts          # isolated launch + failure artifacts
  flows/*.spec.ts      # one file per user flow
  helpers/             # launch, UI actions, screenshots, shortcuts
  artifacts/           # generated screenshots (gitignored)
  test-results/        # Playwright output (gitignored)
```

## Adding a flow

1. Create `e2e/flows/<name>.spec.ts`.
2. Import `test` / `expect` from `../fixtures` (not `@playwright/test` directly) so you get an isolated app session.
3. Use helpers from `e2e/helpers/ui.ts` for shelf, editor, and settings.
4. Call `saveFlowScreenshot(page, testInfo, "step-name")` at important steps.
5. Run `bun run e2e -- e2e/flows/<name>.spec.ts` locally before opening a PR.

New product features should add or extend an e2e flow and attach screenshots in the PR (see `.cursor/rules/janus-autonomy.mdc`).
