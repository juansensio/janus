# Install Janus on macOS

Follow these steps on a clean clone to prove the shell toolchain works. You do not need to read `docs/specs/SPEC-shell.md`.

## Prerequisites

1. [Bun](https://bun.sh) (current stable; lockfile is `bun.lock` at repo root).
2. **Xcode** from the App Store, plus Command Line Tools: `xcode-select --install`.
3. **CocoaPods**: `brew install cocoapods`.
4. An **iOS Simulator** runtime (install from Xcode → Settings → Platforms).

## Commands (in order)

From the repository root:

```bash
git clone <your-remote> janus
cd janus
bun install
bun run test
```

### Development (live reload)

For day-to-day UI work, use the Vite dev server and Electron against `http://127.0.0.1:5173/` (no `build:ui` first):

```bash
bun run dev:desktop
```

Edit `packages/bridge` or `packages/ui` and the Electron window should refresh within a few seconds. Only the shared UI hot-reloads; changing Electron `main`/`preload` still needs a restart (re-run `dev:desktop`).

Optional: run the UI dev server alone (`bun run dev:ui`) and open `http://127.0.0.1:5173/` in a browser (desktop entry needs `window.janus` from Electron preload; use Electron for the real desktop shell).

iOS Simulator live reload (Mac + Xcode):

```bash
bun run dev:ios
```

This starts Vite and runs Capacitor with `CAPACITOR_SERVER_URL` pointing at `/mobile.html` on the dev server. Production-like mobile still uses `bun run cap:sync:ios` after `build:ui`.

### Production-like desktop check

```bash
bun run desktop:prod
```

Close the Electron window when you have confirmed **Janus** inside `<main id="app">` with `data-platform="desktop"`.

If Electron fails to start (missing `path.txt`, *“failed to install correctly”*, or `Electron Framework.framework` not loaded), the `node_modules/electron/dist` bundle is probably incomplete. Fix it with:

```bash
rm -rf node_modules/electron
bun install
bun run ensure:electron
```

Do not run a root `postinstall` hook that touches Electron while `bun install` is still extracting it—that race can leave a broken ~250 KB `Electron.app`.

### iOS Simulator (manual gate)

Capacitor sync and Xcode are required for mobile:

```bash
bun run cap:sync:ios
bun run cap:open:ios
```

In Xcode, select an iPhone or iPad simulator and click **Run**. Confirm **Janus** appears with `data-platform="mobile"`.

### Automated install check

```bash
bun run validate:install
```

This runs unit tests, builds the UI, and asserts `dist/ui` contains the expected artifacts. It exercises the **production** UI build (`build:ui`), not the Vite dev server. It does **not** launch the Simulator; keep the manual Simulator step above for mobile sign-off.

## UI build output

Shared UI is built to **`dist/ui`** at the repo root.

| Artifact | Purpose |
|----------|---------|
| `index.html` | **Desktop** (Electron loads this file from disk after `build:ui`) |
| `mobile.html` | **Capacitor source** entry (mobile bootstrap via Vite alias) |

Capacitor `webDir` is the same `dist/ui` folder. Before sync, `cap:sync:ios` runs **`prepare-cap-web`**, which copies `mobile.html` → `index.html` so the native app loads the mobile shell entry while desktop keeps its own `index.html` in the build output until sync overwrites it for the mobile bundle only on your machine’s synced tree.

The Vite alias `@janus/mobile-entry` (in `packages/ui/vite.config.ts`) is **build-only wiring** for the mobile HTML entry; runtime UI code does not import `apps/mobile`.

Always run `bun run build:ui` before `cap:sync:ios`.

## Optional desktop smoke test

`bun run test:smoke:desktop` is intentionally not wired (Playwright/Electron driver cost); use `bun run validate:install` plus `bun run dev:desktop` for desktop verification.
