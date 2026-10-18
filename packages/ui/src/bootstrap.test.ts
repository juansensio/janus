import { afterEach, describe, expect, it, vi } from "vitest";
import type { JanusBridge } from "@janus/bridge";
import { resolveJanusBridge, startShell } from "./bootstrap";

const originalUserAgent = navigator.userAgent;

afterEach(() => {
    vi.stubGlobal("navigator", { userAgent: originalUserAgent });
    delete (window as { janus?: JanusBridge }).janus;
    document.body.innerHTML = "";
});

describe("resolveJanusBridge", () => {
    it("returns existing window.janus", async () => {
        const bridge: JanusBridge = { platform: () => "desktop" };
        window.janus = bridge;
        await expect(resolveJanusBridge()).resolves.toBe(bridge);
    });

    it("throws on Electron when window.janus is missing", async () => {
        vi.stubGlobal("navigator", {
            userAgent: "Mozilla/5.0 Electron/33.0.0",
        });
        await expect(resolveJanusBridge()).rejects.toThrow(/window\.janus/i);
    });

    it("installs mobile bridge when not Electron and janus is missing", async () => {
        const bridge: JanusBridge = { platform: () => "mobile" };
        const install = vi.fn(async () => {
            window.janus = bridge;
        });
        await expect(
            resolveJanusBridge({ installMobileBridge: install }),
        ).resolves.toBe(bridge);
        expect(install).toHaveBeenCalledOnce();
    });
});

describe("startShell", () => {
    it("throws Missing #app when root element is absent", async () => {
        window.janus = { platform: () => "desktop" };
        await expect(startShell()).rejects.toThrow("Missing #app");
    });
});
