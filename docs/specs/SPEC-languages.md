# Spec: languages

> Status: **not approved**. Depends on implemented shell (`docs/specs/SPEC-shell.md` is approved). Tech stack below is aligned to **TypeScript** in `services/languages/` (pure module, no Electron/Capacitor). Commands and paths will be finalized when the shell monorepo exists; objective and acceptance criteria stand.

## Objective

A writer can use Janus in English or Spanish, and can mark a book as written in English or Spanish. Those are different choices: the menus can be Spanish while the book is English, and the reverse.

This module owns that fact. It answers which languages exist, which interface language is in effect, and what a user-facing string says. It does not store books, draw the window, or talk to an AI.

The user is one writer on one machine.

### Acceptance criteria

- The only language codes are `en` and `es`.
- The interface language is the saved choice, then the operating-system language, then English.
- A language tag such as `es-MX` or `en_GB` counts as `es` or `en`. Anything else counts as no choice.
- A bad saved value does not block startup. It is treated as no choice.
- Every user-facing string lives in both catalogs under the same key.
- When a string addresses the writer, Spanish uses tú.
- A book language is a code this module accepts. This module does not store the book.

## Tech Stack

- **TypeScript** (strict), compiled via the repo toolchain from `docs/specs/SPEC-shell.md`.
- Catalogs are JSON files beside the module.
- Unit tests: **Vitest** (or the shell’s chosen runner) against compiled or source TS.

This module does not import Electron, Capacitor, the DOM, or a database. Catalogs live under `services/languages/locales/`. Shell code in `apps/desktop` and `apps/mobile` calls these functions and passes saved UI locale and OS locale tags in.

## Commands

(Exact paths after shell lands; expected shape:)

```
Test: bun run test --filter @janus/languages
# or from root: bun run test (runs all workspace tests)
Lint: bun run lint
```

No dev server in this module.

## Project Structure

```
services/languages/index.ts           → public functions
services/languages/locales/en.json    → English strings
services/languages/locales/es.json    → Spanish strings
services/languages/languages.test.ts  → unit tests (or tests/languages/)
docs/specs/SPEC-languages.md        → this spec
CAPABILITY-MAP.md                     → module index (repo root)
```

No other package reads the JSON files. Callers use the functions in `index.ts`.

## Code Style

One concern per file: this file resolves languages and looks up strings. Names are verbs. Values are plain data. Errors carry a stable `code`, and tests assert the code, not the sentence. Two-space indent, double quotes, semicolons, no classes, named exports only.

```ts
export const SUPPORTED = ["en", "es"] as const;
export type LanguageCode = (typeof SUPPORTED)[number];

export function resolveUiLocale(
  saved: string | null | undefined,
  system: string | null | undefined,
): LanguageCode {
  return normalize(saved) ?? normalize(system) ?? "en";
}

function normalize(tag: string | null | undefined): LanguageCode | null {
  if (typeof tag !== "string") return null;
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  return (SUPPORTED as readonly string[]).includes(primary)
    ? (primary as LanguageCode)
    : null;
}
```

## Contract

Callers depend on these functions and these error codes. Nothing else in the module is public.

| Function | Behavior |
|---|---|
| `supportedLanguages()` | Returns `["en", "es"]`. |
| `resolveUiLocale(saved, system)` | Returns `en` or `es`. Order: saved, then system, then `en`. `null`, a missing value, or an unsupported tag is skipped. |
| `assertSupported(code)` | Returns `code` when it is exactly `en` or `es`. Throws `UNSUPPORTED_LANGUAGE` otherwise. Manuscript calls this before storing a book language. |
| `message(locale, key)` | Returns the string for a resolved locale. Throws `UNSUPPORTED_LANGUAGE` for a bad locale. Throws `MISSING_MESSAGE` when the key is absent. |
| `catalogKeys(locale)` | Returns the sorted list of keys for that locale. Throws `UNSUPPORTED_LANGUAGE` for a bad locale. |

`message` and `assertSupported` trust nothing. They throw. `resolveUiLocale` is the edge that turns messy tags into a supported code, so startup can call it with raw settings and a raw system tag.

Seed keys, present in both catalogs:

| Key | en | es |
|---|---|---|
| `language.menu` | Language | Idioma |
| `language.english` | English | Inglés |
| `language.spanish` | Spanish | Español |

Later modules add keys here, to both files, in the same change. They do not keep their own string tables.

## Testing Strategy

Unit tests colocated or under `tests/languages/`. No browser and no network.

- `resolveUiLocale` covers a saved choice, a system tag with a region, an unsupported system language, an empty saved value, and both arguments missing.
- `assertSupported` accepts `en` and `es` and rejects `fr`, `en-US`, and `""`.
- `message` returns each seed string in both locales, throws `MISSING_MESSAGE` for an unknown key, and throws `UNSUPPORTED_LANGUAGE` for `fr`.
- One test asserts `catalogKeys("en")` and `catalogKeys("es")` are the same list.

A numeric coverage gate waits until the project sets one. This module is done when the tests above pass.

## Boundaries

- Always: add a key to both catalogs in the same change. Run this module’s test script before considering it done. Keep domain code free of the window, the filesystem, and HTTP.
- Ask first: a third language, a new dependency, a change to the fallback order, moving the catalogs somewhere else.
- Never: a user-facing string outside the catalogs. Copying locale files from Neo. Swallowing a bad code inside `message` or `assertSupported`. Committing secrets. Removing a failing test to get a green run.

## Success Criteria

- Module test script passes.
- `resolveUiLocale("es", "en")` is `es`.
- `resolveUiLocale(null, "es-MX")` is `es`.
- `resolveUiLocale(null, "fr")` is `en`.
- `resolveUiLocale("nope", "en_GB")` is `en`.
- `assertSupported("en")` returns `en`, and `assertSupported("fr")` throws `UNSUPPORTED_LANGUAGE`.
- Both catalogs contain exactly the three seed keys, with the values in the contract table.
- `message("es", "language.spanish")` is `Español`.
- `message("en", "missing")` throws `MISSING_MESSAGE`.

## Open Questions

None for this module. Implement only after `docs/specs/SPEC-shell.md` is approved and the shell toolchain exists.
