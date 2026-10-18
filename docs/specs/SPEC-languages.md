# Spec: languages

> Status: **Slice 1 approved** (2026-10-18). Module id `languages` from [`CAPABILITY-MAP.md`](../../CAPABILITY-MAP.md). Depends on shipped **shell**, **library** (shelf + Settings), and **manuscript** slice 1.

This module owns **which languages exist**, **which interface language is in effect**, and **what every user-facing string says**. It does not store books, draw the window, or talk to an AI.

## Assumptions

```
ASSUMPTIONS I'M MAKING:
1. Slice 1 is the **app (interface) language** in Settings, plus one **language registry** and the **string catalogs**. Autocorrect and AI are not built here; those later modules must consume this registry instead of keeping their own locale lists.
2. **Book language** (a per-book writing language, separate from the UI language) is **out of this slice**. The registry and `assertSupported` exist so manuscript / AI can store and validate a book language later. Until then, the editor’s `lang` / native spellcheck follow the UI locale.
3. Shipped catalogs are **`en` and `es` only**. Adding a third language is a documented contribution (new catalog + one registry entry), not a plugin system. Spanish copy uses **tú**.
4. The saved UI locale lives in host settings (`janus-settings.json` on desktop, same filename under Capacitor Data on mobile) **next to** `libraryRoot`, **not** inside the library folder. Fallback: saved → OS language → English. A bad saved value does not block startup.
5. Changing language **re-renders the current screen immediately**. No app restart. Desktop and mobile both get Settings and the language picker. The library-folder picker stays desktop-only.
6. `packages/ui` does not import `services/*`. Shells call `@janus/languages`; the UI receives `{ locale, messages }` over the bridge.
7. The brand string **Janus** stays untranslated. Default book titles (`Untitled`, `Untitled 2`, …) stay as stored on disk; this slice does not localize generated titles.
→ Correct me now or approve and we proceed with these.
```

## Objective

A writer picks English or Spanish in Settings. Shelf, editor, Settings, dialogs, and errors switch to that language at once. An external contributor can add another language by dropping a catalog and registering its code, without hunting scattered literals.

The user is one writer on one machine. No accounts, no network.

### Phased delivery (this module)

| Phase | Outcome | Depends on |
|--------|---------|------------|
| **Slice 1 — Interface language** (this spec) | Registry, catalogs, Settings picker, all current UI copy in `en`/`es`, persist + resolve UI locale | `shell`, library Settings, manuscript slice 1 |
| **Later — Book language** | Per-book writing language on `book.json`; editor `lang` / AI follow the book | manuscript / `ai-assist` where the map says so |

### User stories

- As a writer, I open Settings, choose Spanish, and every app label I can see is Spanish without restarting.
- As a writer, I choose English again and the chrome returns to English.
- As a writer on a Spanish OS with no saved choice, the first launch is Spanish.
- As a contributor, I add a language by adding one JSON catalog and one registry line; a test fails if any key is missing.

### Acceptance criteria (slice 1)

- Settings (desktop and mobile) includes a **Language** control listing every registered language by **native name** (English, Español).
- Choosing a language persists `uiLocale`, returns the matching catalog, and the visible screen (Settings, shelf, or editor) updates without reload.
- Resolution order: saved `uiLocale` → OS tag → `en`. Tags such as `es-MX` or `en_GB` count as `es` or `en`. Anything else is skipped. A corrupt saved value is treated as no choice.
- Every user-facing string that ships in this slice lives in **both** catalogs under the same key. `packages/ui/src/**/strings.ts` and hardcoded chrome copy (Settings button, bookshelf `aria-label`, library-root source labels) go away.
- `document.documentElement.lang` matches the resolved UI locale. The manuscript textarea uses that `lang` (and native `spellcheck`) until book language exists.
- `supportedLanguages()` / `assertSupported()` are the only list of valid codes. Later features (spellcheck dictionaries, AI output language) must call these; they must not hardcode `en`/`es`.
- `bun run test` and `bun run lint` pass.

## Tech Stack

Same as existing Janus stack (`SPEC-shell.md`):

- **TypeScript** (strict), Bun workspaces, Vitest.
- Domain: `services/languages/` (`@janus/languages`), pure TS, no Electron, Capacitor, or DOM.
- Catalogs: JSON beside the module (`locales/<code>.json`).
- Bridge: extend `@janus/bridge` with locale get/set.
- UI: vanilla TS in `packages/ui`; looks up keys from the catalog the bridge returns.
- Persistence: existing desktop `janus-settings.json`; mobile writes the same shape under Capacitor Data (not under `library/`).

No i18n framework (no i18next, no ICU runtime). Placeholders are `{name}` only.

## Commands

```
Install:     bun install
Build UI:    bun run build:ui
Dev desktop: bun run dev:desktop
Test:        bun run test
Lint:        bun run lint
```

Domain-only (once the workspace package exists):

```
bun run test services/languages
```

No dev server in this module.

## Project Structure

```
services/languages/
  package.json                 → @janus/languages
  index.ts                     → public functions only
  registry.ts                  → registered languages (add a code here)
  resolve-locale.ts            → resolveUiLocale, assertSupported, normalize
  messages.ts                  → load JSON, message(), catalogKeys()
  format-message.ts            → {placeholder} substitution
  languages.test.ts            → unit tests
  locales/en.json              → English catalog
  locales/es.json              → Spanish catalog
  README.md                    → how to add a language (contributor entry)

packages/bridge/src/index.ts   → getUiLanguage, setUiLanguage, types, mock

packages/ui/src/
  i18n.ts                      → hold catalog, t(key, vars?), set document lang
  shelf/, editor/, settings/   → replace strings.ts with t("…")
  mount.ts                     → load catalog before first paint; Settings on mobile

apps/desktop/src/
  library-root.ts              → JanusSettings.uiLocale (merge, do not drop libraryRoot)
  settings-ipc.ts              → get/set UI language
  preload.ts                   → expose methods

apps/mobile/src/native-bridge.ts
                               → same two methods; persist settings beside library/

docs/specs/SPEC-languages.md
docs/install-macos.md          → Settings → Language check
```

No other package reads the JSON files. Callers use `index.ts` (shells) or the bridge catalog (UI).

## Code Style

Match `SPEC-shell.md`, `SPEC-library.md`, and `AGENTS.md`. Domain takes and returns plain values. Errors carry a stable `code`; tests assert the code, not the sentence. Named exports only; no classes unless an `Error` subclass with `code`. Four-space indent, double quotes, semicolons — same as `services/library`.

```ts
export const FALLBACK_LANGUAGE = "en" as const;

export type LanguageCode = string;

export type LanguageDefinition = {
    code: LanguageCode;
    nativeName: string;
};

export function registeredLanguages(): readonly LanguageDefinition[] {
    return REGISTRY;
}

export function supportedLanguages(): LanguageCode[] {
    return REGISTRY.map((entry) => entry.code);
}

export function resolveUiLocale(
    saved: string | null | undefined,
    system: string | null | undefined,
): LanguageCode {
    return normalize(saved) ?? normalize(system) ?? FALLBACK_LANGUAGE;
}

export function assertSupported(code: string): LanguageCode {
    if (!supportedLanguages().includes(code)) {
        throw Object.assign(new Error("Unsupported language"), {
            code: "UNSUPPORTED_LANGUAGE",
        });
    }
    return code;
}

export function message(
    locale: string,
    key: string,
    vars?: Record<string, string>,
): string {
    const catalog = catalogFor(assertSupported(locale));
    const template = catalog[key];
    if (template === undefined) {
        throw Object.assign(new Error(`Missing message: ${key}`), {
            code: "MISSING_MESSAGE",
        });
    }
    return formatMessage(template, vars);
}
```

`REGISTRY` is the only list of shipped languages. `en` and `es` are entries in that list, not a closed TypeScript union that every caller must edit. Adding French is: `locales/fr.json` + `{ code: "fr", nativeName: "Français" }` in the registry.

`formatMessage("Delete \"{title}\"?", { title: "Draft" })` replaces `{title}` only. Unknown placeholders stay as written. Values are not interpolated recursively.

## Contract

### Domain (`services/languages/index.ts`)

| Function | Behavior |
|---|---|
| `registeredLanguages()` | Registry entries in display order (`en`, then `es`). |
| `supportedLanguages()` | `["en", "es"]` from the registry. |
| `resolveUiLocale(saved, system)` | Saved, then system, then `en`. `null`, empty, or unsupported tags are skipped. |
| `assertSupported(code)` | Returns `code` when it is exactly a registered code. Throws `UNSUPPORTED_LANGUAGE` otherwise (`fr` today, `en-US`, `""`). |
| `message(locale, key, vars?)` | String for a resolved locale. Throws `UNSUPPORTED_LANGUAGE` or `MISSING_MESSAGE`. |
| `catalogKeys(locale)` | Sorted keys. Throws `UNSUPPORTED_LANGUAGE`. |
| `catalog(locale)` | Full `Record<string, string>` of templates (no interpolation). Throws `UNSUPPORTED_LANGUAGE`. |

`message` and `assertSupported` throw. `resolveUiLocale` is the edge that turns messy tags into a supported code so startup can pass raw settings and a raw OS tag.

### Bridge

| Method | Behavior |
|--------|----------|
| `getUiLanguage()` | Returns `{ locale, messages, languages }` for the resolved UI locale (`messages` from `catalog(locale)`; `languages` is `registeredLanguages()` for Settings). |
| `setUiLanguage(code)` | `assertSupported(code)`, persist `uiLocale`, return `{ locale, messages }` for that code. Rejects with `UNSUPPORTED_LANGUAGE`. |

OS locale is **not** passed from the UI. Each shell reads it (`app.getLocale()` on desktop; `navigator.language` or Capacitor language on mobile) and calls `resolveUiLocale` inside `getUiLanguage`.

`createMockJanusBridge` starts at `en` with the English catalog (or a minimal fixture that includes every key the UI tests query). `setUiLanguage("es")` switches the mock to Spanish.

Error codes (add to `JanusBridgeErrorCode`): `UNSUPPORTED_LANGUAGE`. `MISSING_MESSAGE` is a domain/programmer error; it must not reach the writer as a blank chrome string. Tests fail if a key is missing; UI must not catch and hide that in production paths.

### Persistence

```ts
export type JanusSettings = {
    libraryRoot?: string;
    uiLocale?: string;
};
```

Load/save already merge JSON. Setting a language must not drop `libraryRoot`. Setting a folder must not drop `uiLocale`.

### UI

- Load `getUiLanguage()` once in `mount.ts` before rendering shelf/editor/Settings. Keep `{ locale, messages }` in module state. `t(key, vars?)` is the only lookup in view code.
- Settings: **Language** `<select>` (or equivalent) of `registeredLanguages()` native names, current `locale` selected. On change, `setUiLanguage(code)` then re-render Settings (and any later navigation) from the returned catalog.
- Settings is available on **mobile** for this picker. `chooseLibraryRoot` remains hidden/disabled on mobile.
- `createShellLabel()` stays `"Janus"`.

### Contributor path (required README in `services/languages/`)

To add a language:

1. Copy `locales/en.json` to `locales/<code>.json` and translate values (keep keys and `{placeholders}`).
2. Append `{ code, nativeName }` to the registry.
3. Run `bun run test` — the key-parity test fails until both catalogs match.

Do not add a second string table in `packages/ui` or in another service.

### Catalog keys (slice 1)

Both files contain exactly these keys. English is the source of truth for wording; Spanish uses tú.

| Key | en | es |
|---|---|---|
| `library.shelfLabel` | Books | Libros |
| `library.addBook` | New book | Libro nuevo |
| `library.empty` | No books yet | Aún no hay libros |
| `library.delete` | Delete | Eliminar |
| `library.rename` | Rename | Renombrar |
| `library.deleteConfirm` | Delete "{title}"? This cannot be undone. | ¿Eliminar «{title}»? Esto no se puede deshacer. |
| `library.loadFailed` | Could not load books. | No se pudieron cargar los libros. |
| `library.createFailed` | Could not create a book. | No se pudo crear el libro. |
| `library.renameFailed` | Could not rename the book. | No se pudo cambiar el nombre del libro. |
| `library.deleteFailed` | Could not delete the book. | No se pudo eliminar el libro. |
| `library.dialog.createTitle` | New book | Libro nuevo |
| `library.dialog.renameTitle` | Rename book | Cambiar nombre |
| `library.dialog.nameLabel` | Book name | Nombre del libro |
| `library.dialog.create` | Create | Crear |
| `library.dialog.save` | Save | Guardar |
| `library.dialog.cancel` | Cancel | Cancelar |
| `library.dialog.invalidTitle` | Enter a book name. | Escribe el nombre del libro. |
| `library.dialog.duplicateTitle` | That name is already on your shelf. Choose a different book name. | Ese nombre ya está en tu estantería. Elige otro. |
| `library.settings` | Settings | Ajustes |
| `library.bookshelfAria` | Bookshelf | Estantería |
| `manuscript.backToShelf` | Shelf | Estantería |
| `manuscript.saving` | Saving… | Guardando… |
| `manuscript.saved` | Saved | Guardado |
| `manuscript.saveFailed` | Could not save this book. | No se pudo guardar este libro. |
| `manuscript.loadFailed` | Could not open this book. | No se pudo abrir este libro. |
| `manuscript.openBook` | Open {title} | Abrir {title} |
| `settings.title` | Settings | Ajustes |
| `settings.libraryLocation` | Library location | Ubicación de la biblioteca |
| `settings.chooseFolder` | Choose folder… | Elegir carpeta… |
| `settings.backToShelf` | Shelf | Estantería |
| `settings.chooseFailed` | Could not use that folder. | No se pudo usar esa carpeta. |
| `settings.libraryRootNotEmpty` | That folder already has books. Choose an empty folder or one without a books folder. | Esa carpeta ya tiene libros. Elige una carpeta vacía o una que no tenga una carpeta books. |
| `settings.devDefaultNote` | Saved folder overrides the development default after reload. | La carpeta guardada sustituye la carpeta de desarrollo después de recargar. |
| `settings.source.env` | Environment override | Variable de entorno |
| `settings.source.devDefault` | Development folder | Carpeta de desarrollo |
| `settings.source.settings` | Custom folder | Carpeta personalizada |
| `settings.source.userData` | Default location | Ubicación predeterminada |
| `settings.language` | Language | Idioma |
| `language.english` | English | Inglés |
| `language.spanish` | Spanish | Español |

Later modules add keys to **both** files in the same change. They do not keep their own string tables.

The language `<select>` labels use `nativeName` from the registry, not `language.english` / `language.spanish`. Those keys are for copy that names a language in the current UI language.

## Testing Strategy

| Layer | What | How |
|--------|------|------|
| Domain | `resolveUiLocale` (saved, regional OS tag, unsupported OS, empty saved, both missing) | Vitest in `services/languages` |
| Domain | `assertSupported` accepts `en`/`es`, rejects `fr`, `en-US`, `""` | Vitest |
| Domain | `message` returns each catalog string; throws `MISSING_MESSAGE` / `UNSUPPORTED_LANGUAGE` | Vitest |
| Domain | `catalogKeys("en")` equals `catalogKeys("es")` (same set) | Vitest |
| Domain | `formatMessage` substitutes `{title}` | Vitest |
| Bridge | Mock get/set round-trip; `setUiLanguage("fr")` rejects | Vitest |
| Desktop IPC | Persist `uiLocale` without dropping `libraryRoot`; bad code rejected | Vitest, temp `userData` |
| UI | Settings lists English/Español; choosing `es` updates visible labels | happy-dom, mocked bridge |
| UI | Mount uses `getUiLanguage` before first paint | happy-dom |
| Mobile | Native bridge get/set persist and resolve | Vitest or adapter test |

A numeric coverage gate waits until the project sets one. Slice 1 is done when the tests above pass and the manual check in `docs/install-macos.md` succeeds: Settings → Language → Español → shelf/editor chrome in Spanish → relaunch still Spanish.

## Boundaries

- **Always:** Add a key to every catalog in the same change. Run `bun run test` and `bun run lint` before treating the slice done. Keep domain free of Electron, Capacitor, and the DOM. Persist `uiLocale` outside the library tree. Keep one registry.
- **Ask first:** Shipping a third language in the Janus product (registry already allows a contributor PR). Localizing `Untitled` book titles. A full i18n library. Per-book language UI. Changing fallback order. Moving catalogs out of `services/languages/locales/`.
- **Never:** A user-facing string outside the catalogs. `packages/ui` importing `services/*`. A second locale list in manuscript, AI, or spellcheck. Copying locale files from Neo. Swallowing a bad code inside `message` or `assertSupported`. Committing secrets. Removing a failing test to get a green run.

## Success Criteria

- Settings on desktop and mobile can switch the app between English and Spanish; the change is visible immediately and survives relaunch.
- `resolveUiLocale("es", "en")` is `es`; `resolveUiLocale(null, "es-MX")` is `es`; `resolveUiLocale(null, "fr")` is `en`; `resolveUiLocale("nope", "en_GB")` is `en`.
- `assertSupported("en")` returns `en`; `assertSupported("fr")` throws `UNSUPPORTED_LANGUAGE`.
- Both catalogs contain exactly the slice 1 keys, with the values in the contract table.
- `message("es", "language.spanish")` is `Español`.
- `message("en", "library.deleteConfirm", { title: "Draft" })` is `Delete "Draft"? This cannot be undone.`
- `message("en", "missing")` throws `MISSING_MESSAGE`.
- `services/languages/README.md` states the three-step add-a-language path.
- `bun run test` and `bun run lint` pass.

## Open Questions

None beyond the assumptions above. Approval means those seven assumptions stand.

On approval: footnote on `CAPABILITY-MAP.md` that languages slice 1 is interface locale + catalogs and does not wait on `ai-assist`; book language stays a later slice. Then **`/plan`** for this spec only. Archive the current library-root plan pair first if it is still the active plan (`janus-planning.mdc`).
