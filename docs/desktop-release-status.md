# Janus desktop — GitHub Release status

> **Audience:** people downloading Janus from GitHub, and maintainers shipping macOS tags.  
> **Install steps:** [install-macos.md](install-macos.md) § Install from GitHub Release.  
> **Spec:** [SPEC-desktop-release.md](specs/SPEC-desktop-release.md).

## Summary

| Question | Answer |
|----------|--------|
| Can I download Janus without cloning the repo? | **Yes** — [GitHub Releases](https://github.com/juansensio/janus/releases) (macOS arm64 zip + dmg). |
| Can I double-click and open with **no** Security / Privacy steps? | **Not yet.** Downloads are **not notarized**. macOS will block or warn until you approve the app once (or use `xattr` / right-click **Open**). |
| What tag should I use? | **`v0.1.2` or newer** — production library defaults to `~/Documents/Janus`. Older tags may point at repo `.janus-library` in Settings. |
| Intel Mac? | **No** — CI builds **arm64** only (Apple Silicon). |
| Windows / iOS app? | **No** — desktop macOS only in this pipeline. |

## What works today (shipped)

| Capability | Status |
|------------|--------|
| Tag `v*` → GitHub Actions **Desktop release (macOS)** | Done |
| Artifacts: `Janus-*-arm64-mac.zip`, `Janus-*-arm64.dmg` | Done |
| Production UI bundled in `Janus.app` (`Resources/ui/`) | Done |
| Tests + `validate:desktop-release` in CI | Done |
| **Ad-hoc codesign** in CI (`afterPack` → `codesign -`) | Done (v0.1.1+) |
| Default library **`~/Documents/Janus`** in Release builds | Done (v0.1.2+) |
| Dev library **`.janus-library/`** in repo | **Dev only** (`bun run dev:desktop`, not packaged app) |
| In-app auto-update | Not planned in v1 |
| Maintainer **`/release`** verify workflow | Done |

### Tag history (informal)

| Tag | Notes |
|-----|--------|
| `v0.1.0` | First Release; unsigned; “damaged” / malware warnings common. |
| `v0.1.1` | Ad-hoc sign in CI; still requires Gatekeeper bypass for browser downloads. |
| `v0.1.2` | Documents/Janus library default; ignores stale `.janus-library` in saved settings when packaged. |

Always prefer the **latest** Release tag unless you are debugging an old build.

## What users see today (Gatekeeper)

After downloading from Chrome or another browser, macOS may show:

1. **“Janus is damaged and can’t be opened”** — usually **quarantine**, not a broken file.
2. **“Apple could not verify Janus is free of malware”** — **unsigned / not notarized** app from the internet.

**Workarounds (required until notarization ships):**

- **Right-click** `Janus.app` → **Open** → **Open** again, **or**
- **System Settings → Privacy & Security** → **Open Anyway** (after a blocked launch), **or**
- `xattr -cr /Applications/Janus.app`

These steps are **one-time per install** for the current release model. They are documented in [install-macos.md](install-macos.md).

## What is missing for “download and open like a normal app”

To open Janus **without** Privacy & Security or right-click **Open**, Apple expects a **notarized** app signed with a **Developer ID Application** certificate. Janus v1 CI does **not** do this yet.

| Requirement | Purpose | Status |
|-------------|---------|--------|
| **Apple Developer Program** membership | Issue signing certificates | Maintainer account (not in repo) |
| **Developer ID Application** cert | Sign `Janus.app` and nested binaries | **Not wired in CI** |
| **Hardened Runtime** + entitlements | Required for notarization | **Not configured** |
| **`notarytool` submit** + **staple** | Apple malware scan; ticket attached to app/dmg | **Not in workflow** |
| GitHub Actions **secrets** | `APPLE_ID`, app-specific password or API key, cert `.p12` | **Not configured** |
| Optional: **Sparkle** / `electron-updater` | Updates without re-downloading | Out of scope v1 |

**Outcome when complete:** User downloads dmg/zip, moves app to Applications, **double-clicks** — no “unverified developer” flow for typical macOS versions (still subject to Apple policy changes).

### Suggested phase 2 (maintainers)

1. Amend [SPEC-desktop-release.md](specs/SPEC-desktop-release.md) with a **signing + notarization** slice (secrets list, `electron-builder` `mac.identity`, `notarize` options).
2. Import cert into CI (e.g. `APPLE_CERTIFICATE_BASE64` + password) or use a signing service.
3. Run `notarytool` on zip/dmg after build; staple ticket.
4. Verify on a **clean Mac** (no prior Janus install): download only from Releases, double-click.
5. Update this doc: set **“Can I open without Security steps?”** to **Yes** for notarized tags.

Until then, treat **Gatekeeper workarounds as expected**, not user error.

## Maintainer quick reference

```bash
# Before tagging
bun run test
bun run validate:install
bun run desktop:package          # macOS
bun run validate:desktop-release

# Ship (version in apps/desktop/package.json must match tag)
git tag v0.1.2
git push origin v0.1.2
```

Workflow: [`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml).

## Related docs

- [install-macos.md](install-macos.md) — clone/dev path + Release install troubleshooting  
- [SPEC-desktop-release-command.md](specs/SPEC-desktop-release-command.md) — `/release` modes  
- `.cursor/skills/janus-desktop-release/reference.md` — paths and CI checklist  
