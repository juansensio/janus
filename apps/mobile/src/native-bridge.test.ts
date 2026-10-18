import { afterEach, describe, expect, it, vi } from "vitest";
import type { JanusBridge } from "@janus/bridge";

vi.mock("@capacitor/filesystem", () => ({
    Directory: { Data: "DATA" },
    Encoding: { UTF8: "utf8" },
    Filesystem: {
        mkdir: vi.fn(async () => {}),
        readdir: vi.fn(async () => ({ files: [] })),
        readFile: vi.fn(async () => ({ data: "" })),
        writeFile: vi.fn(async () => {}),
        rename: vi.fn(async () => {}),
        rmdir: vi.fn(async () => {}),
        stat: vi.fn(async () => ({ type: "directory" })),
    },
}));

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

    it("exposes async library bridge methods", async () => {
        installMobileBridge();
        await expect(window.janus?.listBooks()).resolves.toEqual([]);
        await expect(window.janus?.createBook("Untitled")).resolves.toMatchObject(
            {
                title: "Untitled",
            },
        );
    });

    it("exposes manuscript bridge methods", () => {
        installMobileBridge();
        expect(typeof window.janus?.readManuscript).toBe("function");
        expect(typeof window.janus?.writeManuscript).toBe("function");
    });

    it("exposes UI language get and set", async () => {
        installMobileBridge();
        const en = await window.janus?.getUiLanguage();
        expect(en?.locale).toBe("en");
        const es = await window.janus?.setUiLanguage("es");
        expect(es?.locale).toBe("es");
        expect(es?.messages["library.shelfLabel"]).toBe("Libros");
    });

    it("rejects chooseLibraryRoot on mobile", async () => {
        installMobileBridge();
        await expect(window.janus?.chooseLibraryRoot()).rejects.toMatchObject({
            code: "LIBRARY_ROOT_NOT_SUPPORTED",
        });
    });
});
