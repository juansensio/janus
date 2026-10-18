# @janus/languages

Interface locale registry and string catalogs for Janus.

## Add a language

1. Copy `locales/en.json` to `locales/<code>.json` and translate values (keep keys and `{placeholders}`).
2. Append `{ code, nativeName }` to `registry.ts`.
3. Register the catalog in `messages.ts` (`CATALOGS`).
4. Run `bun run test` — key-parity tests fail until every catalog matches.
