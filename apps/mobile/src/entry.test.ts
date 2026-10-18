import { afterEach, describe, expect, it } from "vitest";
import { installMobileBridge } from "./native-bridge";
import { startShell } from "@janus/ui/bootstrap";

afterEach(() => {
    delete (window as { janus?: unknown }).janus;
    document.body.innerHTML = "";
});

describe("mobile entry", () => {
    it("installs bridge and mounts Janus with data-platform mobile", async () => {
        document.body.innerHTML = '<main id="app"></main>';
        installMobileBridge();
        await startShell();

        const root = document.getElementById("app");
        expect(root?.querySelector("h1")?.textContent).toBe("Janus");
        expect(root?.dataset.platform).toBe("mobile");
    });
});
