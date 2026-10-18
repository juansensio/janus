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

### Library (slice 1b shelf + slice 1c naming)

After `bun run dev:desktop` or `bun run desktop:prod`, verify the dark bookshelf (gold **Janus** wordmark, **BOOKS** row):

1. **Empty shelf** — dashed **+** tile at the end of the row (screen readers hear **No books yet**).
2. **New book** — click **+**; a **New book** dialog opens with **Untitled** (or **Untitled 2**, …) prefilled. Press **Create** to add the card, or **Cancel** to leave the shelf unchanged. Enter a custom name before **Create** to use that title.
3. **Rename** — hover or focus a card, click the pencil (edit) icon; change the name in **Rename book** and press **Save**.
4. **Delete** — hover or focus a card, click the minus icon; confirm with **Delete "{title}"? This cannot be undone.**; the card disappears.
5. **Wrap** — with several books, cards wrap within the window width (no horizontal scrollbar on the shelf row; the page may scroll vertically).
6. **Persistence** — quit the app completely and reopen (`dev:desktop` or `desktop:prod`); the same books and titles remain in the same order.

On **iOS Simulator** (`bun run dev:ios` for live reload, or `cap:sync:ios` + Xcode Run for production-like), repeat steps 1–6 with `data-platform="mobile"`.

### Manuscript (slice 1 — open and autosave)

After the shelf checks above:

1. **Open** — click a book card (not the edit or delete icons). The editor shows the book title, a **Shelf** control, and a text field. A book with no `manuscript.md` yet opens empty.
2. **Type** — enter text; after about a second the status shows **Saved** (no Save button).
3. **Shelf** — return to the bookshelf; reopen the same book and confirm the text is still there.
4. **Relaunch** — quit the app completely, reopen, open the book again; text persists.
5. **Shelf actions** — rename and delete still work from the shelf; delete removes the book folder including `manuscript.md`.

### Library location (slice 1 — dev folder + desktop Settings)

**Development (`bun run dev:desktop`):**

1. Books are stored under **`.janus-library/books/`** at the repo root (gitignored) unless you pick another folder in Settings.
2. On first run after this change, if you previously used Electron’s default library under Application Support, Janus **moves** that folder into `.janus-library` so existing books stay with you.
3. **Settings → Choose folder…** is available in dev. Janus **moves** your existing `books/` tree into the chosen folder, saves the path, and reloads. A saved path overrides `.janus-library` on later runs (still below `JANUS_LIBRARY_ROOT`).
4. Optional override: `JANUS_LIBRARY_ROOT=/absolute/path bun run dev:desktop`.

### Interface language (slice 1)

1. Open **Settings** from the shelf (desktop or mobile).
2. Under **Language**, choose **Español**. Shelf, editor, and Settings labels should switch to Spanish immediately (no restart).
3. Quit and relaunch the app; the UI should still be Spanish.

### OpenAI assist (desktop — Sign in with ChatGPT)

Requires a **ChatGPT Plus or Pro** plan with plan usage enabled for local tools (see [`docs/adrs/ADR-ai-openai-auth.md`](adrs/ADR-ai-openai-auth.md)).

1. Run `bun run dev:desktop` or `bun run desktop:prod`.
2. Open **Settings** → **OpenAI (Codex)** → **Connect OpenAI**. The system browser opens; complete sign-in and approve access.
3. Confirm status shows **Connected**. Quit and relaunch; status should remain connected until **Disconnect**.
4. Open a book, add an AI comment, press **Write**, and confirm a highlighted draft appears; use **Accept** or **Reject** as needed.

Tokens stay in the Electron **main** process (encrypted on disk). The renderer never sees refresh tokens.

**Maintainer override (optional):** set `JANUS_OPENAI_ACCESS_TOKEN` in the environment before starting Electron to skip SIWC for local HTTP testing only. This is not the normal user path.

**Production desktop (`bun run desktop:prod`):**

1. Open **Settings** from the shelf (desktop only).
2. Confirm the displayed library path; use **Choose folder…** to pick a directory.
3. Janus moves existing books into the new folder when possible; if the target already has a non-empty `books/` folder, you’ll see an error instead of merging libraries.
4. After the window reloads, create or open a book and confirm files appear under `<chosen>/books/<Title>/` (folder name matches the book title; `book.json` still holds the uuid `id`).

Mobile library location is unchanged (app sandbox).

`bun run validate:install` remains a **shell** toolchain check (tests + `build:ui` artifacts); it does not launch Electron or the Simulator. Use the steps above for library, manuscript, and library-location sign-off.

If Electron fails to start (missing `path.txt`, *“failed to install correctly”*, or `Electron Framework.framework` not loaded), the `node_modules/electron/dist` bundle is probably incomplete. Fix it with:

```bash
rm -rf node_modules/electron
bun install
bun run ensure:electron
```

Do not run a root `postinstall` hook that touches Electron while `bun install` is still extracting it—that race can leave a broken ~250 KB `Electron.app`.

### Vite / esbuild: `The service was stopped`

On some macOS setups, unsigned `esbuild` binaries are killed (exit **137**) and Vite fails while loading `vite.config.ts` with **The service was stopped**.

After `bun install`, run:

```bash
bun run ensure:esbuild
```

Root `postinstall` runs this automatically on **macOS** (adhoc `codesign` on `esbuild` + `@esbuild/darwin-arm64`). If `build:ui` or `dev:desktop` still fails, rerun `ensure:esbuild` manually.

### iOS Simulator (manual gate)

Capacitor sync and Xcode are required for mobile:

```bash
bun run cap:sync:ios
bun run cap:open:ios
```

In Xcode, select an iPhone or iPad simulator and click **Run**. Confirm **Janus** appears with `data-platform="mobile"`.

### Install from GitHub Release (macOS, Apple Silicon)

**Release status (what works, what Gatekeeper still requires, roadmap to notarization):** [desktop-release-status.md](desktop-release-status.md).

Use this when you want Janus **without** cloning the repo or installing Bun.

1. Open **[Releases](https://github.com/juansensio/janus/releases)** and download the **latest** tag (prefer **`v0.1.2+`** for `~/Documents/Janus` library defaults).
2. Download **`Janus-*-arm64-mac.zip`** or the **`.dmg`** (arm64 / Apple Silicon only in v1).
3. **Zip:** unzip, then drag **Janus.app** into **Applications**.
4. **First launch:** Releases from **v0.1.1** onward are ad-hoc signed in CI; macOS may still block downloads from Chrome. If you see **“Janus is damaged and can’t be opened”**, the app is usually fine — that message often means **quarantine**, not a corrupt file. Do **not** click **Move to Bin** until you try:
   - **Right-click** **Janus** → **Open** → **Open** again, or
   - Remove quarantine (replace the path if Janus is not in Applications):
   ```bash
   xattr -cr /Applications/Janus.app
   ```
   If it still fails: `codesign --force --deep --sign - /Applications/Janus.app` then open again.

   **“Apple could not verify … malware”** — click **Done**, then **System Settings → Privacy & Security → Open Anyway**, or use right-click **Open** as above. **Double-click install with no Security steps** requires **notarized** builds; see [desktop-release-status.md](desktop-release-status.md) § What is missing.
5. Confirm the shelf appears (`data-platform="desktop"` on `<main id="app">`). Books default to **`~/Documents/Janus/books/`** (or a folder you choose in **Settings**). The repo’s **`.janus-library/`** is for **`bun run dev:desktop` only**, not for Release builds.

Maintainers: run `/release verify` (or `bun run validate:desktop-release` after `bun run desktop:package`) before pushing a `v*` tag.

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
