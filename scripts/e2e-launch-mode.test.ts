import { afterEach, describe, expect, it } from "vitest";
import {
    E2E_WATCH_DEFAULT_SLOW_MO_MS,
    resolveElectronSlowMoMs,
} from "../e2e/helpers/launch-mode";

const env = process.env;

afterEach(() => {
    process.env = env;
});

describe("resolveElectronSlowMoMs", () => {
    it("returns 0 for default CI e2e", () => {
        delete process.env.JANUS_E2E_WATCH;
        delete process.env.JANUS_E2E_SLOW_MO;
        expect(resolveElectronSlowMoMs()).toBe(0);
    });

    it("returns watch default when JANUS_E2E_WATCH is set", () => {
        process.env.JANUS_E2E_WATCH = "1";
        delete process.env.JANUS_E2E_SLOW_MO;
        expect(resolveElectronSlowMoMs()).toBe(E2E_WATCH_DEFAULT_SLOW_MO_MS);
    });

    it("honors JANUS_E2E_SLOW_MO override", () => {
        process.env.JANUS_E2E_WATCH = "1";
        process.env.JANUS_E2E_SLOW_MO = "1200";
        expect(resolveElectronSlowMoMs()).toBe(1200);
    });
});
