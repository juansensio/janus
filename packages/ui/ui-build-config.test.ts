import { describe, expect, it } from "vitest";
import config from "./vite.config";

describe("vite UI build config", () => {
    it("uses a relative base so Electron file:// can load assets", () => {
        expect(config.base).toBe("./");
    });
});
