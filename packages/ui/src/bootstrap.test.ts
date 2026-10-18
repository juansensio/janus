import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockJanusBridge, type JanusBridge } from "@janus/bridge";
import { resolveJanusBridge, startShell } from "./bootstrap";

const originalUserAgent = navigator.userAgent;

afterEach(() => {
    vi.stubGlobal("navigator", { userAgent: originalUserAgent });
    delete (window as { janus?: JanusBridge }).janus;
    document.body.innerHTML = "";
});

describe("resolveJanusBridge", () => {
    it("returns existing window.janus", async () => {
        const bridge = createMockJanusBridge({ platform: () => "desktop" });
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
        const bridge = createMockJanusBridge({ platform: () => "mobile" });
        const install = vi.fn(async () => {
            window.janus = bridge;
        });
        await expect(
            resolveJanusBridge({ installMobileBridge: install }),
        ).resolves.toBe(bridge);
        expect(install).toHaveBeenCalledOnce();
    });

    it("throws when mobile install hook is missing on web", async () => {
        await expect(resolveJanusBridge()).rejects.toThrow(
            /Capacitor\/mobile entry/i,
        );
    });

    it("throws when install hook leaves window.janus unset", async () => {
        const install = vi.fn(async () => {});
        await expect(
            resolveJanusBridge({ installMobileBridge: install }),
        ).rejects.toThrow(/after mobile bridge install/i);
    });
});

describe("startShell", () => {
    it("throws Missing #app when root element is absent", async () => {
        window.janus = createMockJanusBridge({ platform: () => "desktop" });
        await expect(startShell()).rejects.toThrow("Missing #app");
    });
});
