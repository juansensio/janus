import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCapacitorServer } from "./capacitor-server";

const originalDevUrl = process.env.CAPACITOR_SERVER_URL;

afterEach(() => {
    if (originalDevUrl === undefined) {
        delete process.env.CAPACITOR_SERVER_URL;
    } else {
        process.env.CAPACITOR_SERVER_URL = originalDevUrl;
    }
    vi.resetModules();
});

describe("resolveCapacitorServer", () => {
    it("returns undefined when dev URL is unset", () => {
        expect(resolveCapacitorServer(undefined)).toBeUndefined();
    });

    it("returns server config when dev URL is set", () => {
        expect(
            resolveCapacitorServer("http://127.0.0.1:5173/mobile.html"),
        ).toEqual({
            url: "http://127.0.0.1:5173/mobile.html",
            cleartext: true,
        });
    });

    it("loads capacitor.config without server.url when env is unset", async () => {
        delete process.env.CAPACITOR_SERVER_URL;
        vi.resetModules();
        const { default: config } = await import("../capacitor.config");
        expect(config.server?.url).toBeUndefined();
    });
});
