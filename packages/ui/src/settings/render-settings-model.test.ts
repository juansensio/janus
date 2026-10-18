import { createMockJanusBridge } from "@janus/bridge";
import { describe, expect, it, afterEach, vi } from "vitest";
import { initTestI18n } from "../test-i18n";
import { renderSettings } from "./render-settings";

afterEach(() => {
    document.body.innerHTML = "";
});

describe("renderSettings OpenAI model", () => {
    it("lists models returned by the bridge without disabling the select", async () => {
        initTestI18n("en");
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            getAiProviderStatus: async () => ({ connected: true }),
            getOpenAiModelSettings: async () => ({
                preference: "auto",
                options: ["auto", "gpt-4o", "codex-from-api"],
            }),
            getLibraryRoot: async () => ({
                path: "/data/library",
                source: "user-data",
            }),
        });
        await renderSettings(host, bridge, { onBack: () => {} });
        const modelSelect = host.querySelector(
            ".settings-openai-model",
        ) as HTMLSelectElement;
        await vi.waitFor(() => expect(modelSelect.disabled).toBe(false));
        const labels = [...modelSelect.options].map((o) => o.textContent);
        expect(labels).toEqual(["Auto", "GPT-4o", "codex-from-api"]);
        expect(host.textContent).not.toContain("Could not use that folder.");
    });
});
