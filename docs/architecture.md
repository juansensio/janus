# Architecture

How Janus is layered, and why **`services/`** and **`packages/bridge`** are separate. Module responsibilities and build order live in [`CAPABILITY-MAP.md`](../CAPABILITY-MAP.md); per-module acceptance criteria live in [`docs/specs/`](specs/). Engineering constraints (one domain owner, no logic in templates) are in [`AGENTS.md`](../AGENTS.md).

## Overview

Janus is a **Bun workspace** with one shared web UI and **two native hosts**:

| Host | Path | Role |
|------|------|------|
| Desktop | `apps/desktop` | Electron main + preload; Node filesystem |
| Mobile | `apps/mobile` | Capacitor; iOS Simulator is the first mobile gate on Mac |

Domain features are implemented as **TypeScript modules** under `services/<domain>/` (published as `@janus/<domain>`). The UI is built once in `packages/ui` and shipped into both shells.

```
package.json          workspaces: packages/*, apps/*, services/*
CAPABILITY-MAP.md     module index and recorded decisions
packages/bridge       JanusBridge contract (UI ↔ host)
packages/ui           shared Vite bundle, mount + screens
services/<domain>/    business rules (pure TS, no shell imports)
apps/desktop          Electron IPC + library adapter
apps/mobile           Capacitor FS + mobile bridge install
```

## Layers

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Domain** | `services/<domain>/` | Rules, on-disk shapes, validation. Depends on plain values and injected ports (e.g. filesystem), not on Electron, Capacitor, or the DOM. |
| **Contract** | `packages/bridge` | Stable API the webview may call: `JanusBridge`, shared DTOs (`BookSummary`), error codes, test mocks. |
| **Presentation** | `packages/ui` | Structure, styling, user events. Calls the bridge; does **not** import `services/*`. |
| **Shell / infra** | `apps/desktop`, `apps/mobile` | Process boundaries, IPC, preload, native FS adapters, wiring domain services into `JanusBridge`. |

Dependency direction:

```
packages/ui  →  @janus/bridge  ←  apps/* (implementations)
                      ↑
              services/* (used only from shell code, not from UI)
```

## Why `services/`?

Each business domain has **one owning module** (see `AGENTS.md` invariant 10). Example: library shelf behavior lives in `services/library/` (`@janus/library`) — list/create/delete books on disk, manifest parsing, ID validation, untitled titles, shelf sort order.

Domain code takes **ports** instead of calling Node or Capacitor directly. Library exposes `ShelfFs`; `createShelfService(libraryRoot, fs)` holds the rules:

- **Same behavior** on desktop and mobile: both shells call `createShelfService` with different `fs` implementations.
- **Fast tests**: in-memory or fake `ShelfFs` without Electron or Simulator.
- **No platform leakage**: domain modules stay importable from unit tests and from either shell.

Thin shell wrappers are allowed when a platform needs a one-liner adapter (e.g. `apps/desktop/src/library-service.ts` adds Node `path.join` then delegates to `createShelfService`).

Future capabilities (`manuscript`, `languages`, `ai-assist`, …) add `services/<name>/` the same way.

## Why `packages/bridge`?

The bridge is **not** where shelf logic lives. It is the **contract between the shared webview and the host**, as required by [`docs/specs/SPEC-shell.md`](specs/SPEC-shell.md):

- `packages/ui` must not import domain packages from `services/`.
- Desktop and mobile each expose **one** object implementing `JanusBridge` as `window.janus`.

The bridge package holds:

- **`JanusBridge`** — async methods the UI needs (`platform`, `listBooks`, `createBook`, `deleteBook`, … as the product grows).
- **Shared types** — e.g. `BookSummary` returned to the UI.
- **Stable error codes** — e.g. `BOOK_NOT_FOUND`, `INVALID_BOOK_ID` (callers and tests use `error.code`, not message text).
- **`createMockJanusBridge`** — Vitest and local UI work without disk or IPC.

Reasons this stays a separate package:

1. **Electron security** — The renderer must not touch the library directory. Preload exposes only the bridge; the **main process** runs domain code and talks over IPC (`apps/desktop/src/preload.ts`, `library-ipc.ts`).
2. **One UI, two shells** — `packages/ui` resolves `window.janus` (`bootstrap.ts`) and passes it to `mountJanusShell` / feature renderers. Shelf UI calls `bridge.listBooks()`, not `@janus/library`.
3. **Contract tests** — Bridge types and mocks document what both platforms must implement.

On mobile there is no IPC: `apps/mobile/src/native-bridge.ts` builds `JanusBridge` methods that forward to the same `createShelfService` with a Capacitor filesystem adapter. The UI code path is identical; only the adapter differs.

## Presentation vs domain (invariant 12)

Templates and UI code **display** values and **invoke** the bridge. They do not encode domain rules (ID format, manifest fields, title allocation, sort keys). Those belong in `services/<domain>/`. UI copy and layout (e.g. `packages/ui/src/shelf/strings.ts`) are presentation, not business logic.

## Example: shelf create (desktop)

1. User activates **New book** in `packages/ui/src/shelf/render-shelf.ts` → `bridge.createBook()`.
2. Preload forwards to IPC `janus:library:createBook`.
3. Main handler in `registerLibraryIpc` → `createLibraryService` → `createShelfService` with Node `fs`.
4. A `BookSummary` returns to the renderer; the shelf re-renders.

**Mobile:** same UI → `bridge.createBook()` → `shelfService.createBook()` in the WebView with Capacitor `ShelfFs`.

**Tests:** UI tests use `createMockJanusBridge`; domain tests use `createShelfService` + fake `ShelfFs`; desktop tests cover IPC wiring and error mapping (`library-errors.ts`).

## Mental model

| Question | Answer in |
|----------|-----------|
| What is true about books on disk? | `services/library` (and future domain modules) |
| What may the web UI ask the app to do? | `packages/bridge` (`JanusBridge`) |
| How does this platform perform those calls? | `apps/desktop` or `apps/mobile` |
| How does it look? | `packages/ui` |

## Related docs

- Install and manual gates: [`docs/install-macos.md`](install-macos.md)
- Shell toolchain and bridge introduction: [`docs/specs/SPEC-shell.md`](specs/SPEC-shell.md)
- Library slice 1 (shelf CRUD): [`docs/specs/SPEC-library.md`](specs/SPEC-library.md)
