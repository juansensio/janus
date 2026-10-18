# Janus /release reference

## Version and tag

| Source | Example |
|--------|---------|
| Git tag | `v0.1.0` |
| `apps/desktop/package.json` `version` | `0.1.0` (must match tag without `v`) |

CI fails the version check when they differ.

## Local package output

| Path | Purpose |
|------|---------|
| `apps/desktop/release/mac-arm64/Janus.app` | Unpacked app (default validate path) |
| `apps/desktop/release/Janus-*-arm64-mac.zip` | Release zip |
| `apps/desktop/release/Janus-*-arm64.dmg` | Release disk image |

Packaged UI (required):

```text
Janus.app/Contents/Resources/ui/index.html
Janus.app/Contents/Resources/ui/assets/
```

## Commands

```bash
bun install --frozen-lockfile
bun run test
bun run validate:install
bun run desktop:package
bun run validate:desktop-release
# optional: validate-desktop-release /path/to/Janus.app
```

## Workflow

File: `.github/workflows/desktop-release.yml`

- Trigger: `push.tags: v*`
- Runner: `macos-latest`
- Steps: install → version check → test → build:ui → desktop build → package → validate → `softprops/action-gh-release`

## Builder config

`apps/desktop/package.json` → `build` field:

- `appId`: `com.janus.writer`
- `productName`: `Janus`
- `extraResources`: repo `dist/ui` → `Resources/ui`
- `mac.target`: `zip`, `dmg` (arm64 on Apple Silicon runners)
- `afterPack`: `scripts/after-pack-adhoc-sign.cjs` — `codesign --sign -` on `.app` (CI + local package)

Workspace packages are **devDependencies**; main/preload are pre-bundled with Bun into `apps/desktop/dist/`.

**User install:** “damaged” after Chrome download → quarantine; see `docs/install-macos.md` (`xattr -cr` or right-click Open). Notarization is a later slice.

## Install docs

`docs/install-macos.md` — **Install from GitHub Release** (unsigned Gatekeeper, arm64).
