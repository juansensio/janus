# @janus/languages

Interface locale registry and string catalogs for Janus. The web UI never imports this package; shells load catalogs and pass `{ locale, messages }` through `JanusBridge` (`getUiLanguage` / `setUiLanguage`). Full module contract: [`docs/specs/SPEC-languages.md`](../../docs/specs/SPEC-languages.md).

## Shipped languages

| Code | Native name (Settings picker) | Catalog |
|------|-------------------------------|---------|
| `en` | English | `locales/en.json` |
| `es` | Español | `locales/es.json` |

Adding a language is a **code change in this folder only** — no new npm packages, no i18n framework, and no string tables under `packages/ui`.

## How to add a language

Use a short [BCP 47](https://www.rfc-editor.org/rfc/rfc5646) **language subtag** as the code (e.g. `fr`, `de`, `pt`). Regional variants are resolved at runtime (`fr-CA` → `fr` once `fr` is registered); you still ship one catalog per registered code.

### 1. Add the catalog

```bash
cp services/languages/locales/en.json services/languages/locales/<code>.json
```

Translate **values** only:

- Keep every **key** identical to `en.json` (same names, same count).
- Keep **`{placeholders}`** unchanged (`{title}`, `{name}`, …). Only translate the surrounding text.
- Do not translate the product name **Janus** when it appears in copy.
- Match the tone of existing locales (Spanish uses **tú**).

Example placeholder:

```json
"library.deleteConfirm": "Delete \"{title}\"? This cannot be undone."
```

### 2. Register the language

In `registry.ts`, append an entry **in display order** (Settings lists languages in this order):

```ts
{ code: "fr", nativeName: "Français" },
```

`nativeName` is what writers see in the Settings **Language** control. It is usually the language name in that language, not in the current UI locale.

### 3. Wire the catalog

In `messages.ts`, import the JSON and add it to `CATALOGS`:

```ts
import fr from "./locales/fr.json";

const CATALOGS: Record<string, Record<string, string>> = {
    en: en as Record<string, string>,
    es: es as Record<string, string>,
    fr: fr as Record<string, string>,
};
```

### 4. Verify

```bash
bun run test services/languages
bun run test
bun run lint
```

`languages.test.ts` asserts:

- `catalogKeys("<code>")` matches `catalogKeys("en")` (key parity).
- `resolveUiLocale` / `assertSupported` / `message` behavior for registered codes.

Optional manual check: `bun run dev:desktop` → Settings → pick the new language → shelf and editor chrome should update without restart.

### 5. New UI copy elsewhere in the repo

When a feature adds user-visible text, add the **same key** to **every** file under `locales/` in one change. Keys are listed in `SPEC-languages.md` (catalog keys table). Do not add literals or `strings.ts` files under `packages/ui`.

## What you do not need to change

| Layer | Why |
|-------|-----|
| `packages/ui` | Uses `t("…")` and catalogs from the bridge only. |
| `packages/bridge` | Already exposes get/set UI language; mock uses `@janus/languages` internally. |
| Desktop / mobile shells | Persist `uiLocale` in `janus-settings.json`; no per-language shell code. |
| Settings UI | Language `<select>` is built from `registeredLanguages()` returned with `getUiLanguage()`. |

## Product vs contributor

The **registry** allows any number of languages. Shipping a new language **in the Janus product** (enabled by default for all users) is a product decision — see SPEC “Ask first”. A contributor PR that adds `locales/<code>.json` + registry + tests is the normal path.

## Files in this package

| File | Role |
|------|------|
| `registry.ts` | Ordered list of `{ code, nativeName }` |
| `resolve-locale.ts` | `resolveUiLocale`, `normalize`, `assertSupported` |
| `messages.ts` | Load catalogs, `message`, `catalog`, `catalogKeys` |
| `format-message.ts` | `{placeholder}` substitution |
| `locales/*.json` | Template strings (source of truth for UI copy) |
| `languages.test.ts` | Locale resolution, key parity, messages |
