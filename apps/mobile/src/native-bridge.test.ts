import { afterEach, describe, expect, it } from "vitest";
import type { JanusBridge } from "@janus/bridge";
import { installMobileBridge } from "./native-bridge";

afterEach(() => {
    delete (window as { janus?: JanusBridge }).janus;
});

describe("installMobileBridge", () => {
    it("exposes window.janus with platform mobile", () => {
        installMobileBridge();
        expect(window.janus?.platform()).toBe("mobile");
    });

    it("fails regression when platform is not mobile", () => {
        installMobileBridge();
        const platform = window.janus?.platform();
        expect(platform).not.toBe("desktop");
        expect(platform).toBe("mobile");
    });
});
