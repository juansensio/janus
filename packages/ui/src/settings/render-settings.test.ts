import { createMockJanusBridge } from "@janus/bridge";
import { afterEach, describe, expect, it, vi } from "vitest";
import { t } from "../i18n";
import { mountJanusShell } from "../mount";
import { initTestI18n } from "../test-i18n";
import { renderSettings } from "./render-settings";

afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

describe("renderSettings", () => {
    it("shows library path from getLibraryRoot", async () => {
        initTestI18n("en");
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            getLibraryRoot: async () => ({
                path: "/data/custom-library",
                source: "settings",
            }),
        });
        await renderSettings(host, bridge, { onBack: () => {} });
        expect(host.textContent).toContain("/data/custom-library");
        expect(host.textContent).toContain("Custom folder");
    });

    it("shows Choose folder when library uses dev default", async () => {
        initTestI18n("en");
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            getLibraryRoot: async () => ({
                path: "/repo/.janus-library",
                source: "dev-default",
            }),
        });
        await renderSettings(host, bridge, { onBack: () => {} });
        expect(host.querySelector(".settings-choose")).not.toBeNull();
        expect(host.textContent).toContain(t("settings.devDefaultNote"));
    });

    it("shows OpenAI model selector on desktop", async () => {
        initTestI18n("en");
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            getLibraryRoot: async () => ({
                path: "/data/library",
                source: "user-data",
            }),
        });
        await renderSettings(host, bridge, { onBack: () => {} });
        const modelSelect = host.querySelector(
            ".settings-openai-model",
        ) as HTMLSelectElement;
        expect(modelSelect).not.toBeNull();
        const labels = [...modelSelect.options].map((o) => o.textContent);
        expect(labels).toContain("Auto");
        expect(labels).toContain("GPT-4o");
    });

    it("lists English and Español in the language select", async () => {
        initTestI18n("en");
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            getLibraryRoot: async () => ({
                path: "/data/library",
                source: "user-data",
            }),
        });
        await renderSettings(host, bridge, { onBack: () => {} });
        const select = host.querySelector(
            ".settings-language",
        ) as HTMLSelectElement;
        expect(select).not.toBeNull();
        const labels = [...select.options].map((o) => o.textContent);
        expect(labels).toEqual(["English", "Español"]);
    });

    it("updates labels when choosing Spanish", async () => {
        initTestI18n("en");
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            getLibraryRoot: async () => ({
                path: "/data/library",
                source: "user-data",
            }),
        });
        await renderSettings(host, bridge, { onBack: () => {} });
        const select = host.querySelector(
            ".settings-language",
        ) as HTMLSelectElement;
        select.value = "es";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        await vi.waitFor(() =>
            expect(host.querySelector(".settings-title")?.textContent).toBe(
                "Ajustes",
            ),
        );
    });

    it("opens settings from shelf on desktop", async () => {
        initTestI18n("en");
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [],
            getLibraryRoot: async () => ({
                path: "/data/library",
                source: "user-data",
            }),
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-settings")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-settings")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".settings-path")?.textContent).toBe(
                "/data/library",
            ),
        );
    });

    it("opens settings from shelf on mobile", async () => {
        initTestI18n("en");
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            platform: () => "mobile",
            listBooks: async () => [],
            getLibraryRoot: async () => ({
                path: "library",
                source: "user-data",
            }),
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-settings")).not.toBeNull(),
        );
    });
});
