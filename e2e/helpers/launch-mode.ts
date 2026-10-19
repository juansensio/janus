/** Default delay between Playwright actions when `bun run e2e:watch` is used. */
export const E2E_WATCH_DEFAULT_SLOW_MO_MS = 400;

/**
 * Playwright `slowMo` for Electron. CI and `bun run e2e` use 0; `e2e:watch` uses a default pause.
 * Override with `JANUS_E2E_SLOW_MO` (milliseconds, 0 allowed).
 */
export function resolveElectronSlowMoMs(): number {
    const raw = process.env.JANUS_E2E_SLOW_MO;
    if (raw !== undefined && raw !== "") {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    }
    if (process.env.JANUS_E2E_WATCH === "1") {
        return E2E_WATCH_DEFAULT_SLOW_MO_MS;
    }
    return 0;
}

export function isE2eWatchMode(): boolean {
    return process.env.JANUS_E2E_WATCH === "1";
}
