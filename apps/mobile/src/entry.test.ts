import { afterEach, describe, expect, it, vi } from "vitest";
import { installMobileBridge } from "./native-bridge";
import { startShell } from "@janus/ui/bootstrap";

vi.mock("@capacitor/filesystem", () => ({
    Directory: { Data: "DATA" },
    Encoding: { UTF8: "utf8" },
    Filesystem: {
        mkdir: vi.fn(async () => {}),
        readdir: vi.fn(async () => ({ files: [] })),
        readFile: vi.fn(async () => ({ data: "" })),
        writeFile: vi.fn(async () => {}),
        rmdir: vi.fn(async () => {}),
        stat: vi.fn(async () => ({ type: "directory" })),
    },
}));

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
