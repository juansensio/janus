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
bun run build:ui
bun run dev:desktop
```

Close the Electron window when you have confirmed the window shows **Janus** inside `<main id="app">` with `data-platform="desktop"`.

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

This runs unit tests, builds the UI, and asserts `dist/ui` contains the expected artifacts. It does **not** launch the Simulator; keep the manual Simulator step above for mobile sign-off.

## UI build output

Shared UI is built to **`dist/ui`** at the repo root. Electron loads it from disk; Capacitor `webDir` points at the same folder. Always run `bun run build:ui` before `cap:sync:ios`.

## Optional desktop smoke test

`bun run test:smoke:desktop` is intentionally not wired (Playwright/Electron driver cost); use `bun run validate:install` plus `bun run dev:desktop` for desktop verification.
