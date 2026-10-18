import { describe, expect, it } from "vitest";
import config from "./vite.config";

describe("vite UI build config", () => {
    it("uses a relative base so Electron file:// can load assets", () => {
        expect(config.base).toBe("./");
    });

    it("exposes a dev server on port 5173 by default", () => {
        expect(config.server?.port).toBe(5173);
        expect(config.server?.host).toBe(true);
    });

    it("does not import mobile shell via @janus/mobile package alias", () => {
        const alias = config.resolve?.alias;
        const entries = Array.isArray(alias)
            ? alias
            : alias
              ? Object.entries(alias)
              : [];
        const keys = entries.map(([key]) =>
            typeof key === "string" ? key : String(key),
        );
        expect(keys).not.toContain("@janus/mobile");
    });
});
