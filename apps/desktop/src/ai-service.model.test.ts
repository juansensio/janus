import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { FetchFn } from "@janus/ai-assist";
import * as aiSessionStore from "./ai-session-store";
import { createAiBridgeService } from "./ai-service";

describe("createAiBridgeService OpenAI model preference", () => {
    const settingsWrites: unknown[] = [];
    const settingsFs = {
        readFile: async () =>
            JSON.stringify({ openAiModel: "gpt-4.1" }),
        writeFile: async (_path: string, data: string) => {
            settingsWrites.push(JSON.parse(data));
        },
        mkdir: async () => {},
    };
    const manuscriptFs = {
        join: (...parts: string[]) => parts.join("/"),
        readFile: async () =>
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment></janus-manuscript>',
        writeFile: async () => {},
        rename: async () => {},
        realpath: async (p: string) => p,
        mkdir: async () => {},
        readdir: async () => [],
        stat: async () => ({ isDirectory: () => true }),
    };

    const modelsFetch: FetchFn = async (url) => {
        if (url.endsWith("/v1/models")) {
            return new Response(
                JSON.stringify({
                    models: [
                        { slug: "gpt-4o", visibility: "list" },
                        { slug: "gpt-4.1", visibility: "list" },
                    ],
                }),
                { status: 200 },
            );
        }
        throw new Error(`unexpected fetch: ${url}`);
    };

    beforeEach(() => {
        vi.spyOn(aiSessionStore, "loadAiSession").mockResolvedValue({
            provider: "openai-codex",
            version: "dev-override",
            accessToken: "token",
            connectedAt: new Date().toISOString(),
        });
        settingsWrites.length = 0;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns only auto when not connected", async () => {
        vi.spyOn(aiSessionStore, "loadAiSession").mockResolvedValue(null);
        const ai = createAiBridgeService("/lib", manuscriptFs, {
            userDataPath: "/user",
            settingsFs,
        });
        await expect(ai.getOpenAiModelSettings()).resolves.toEqual({
            preference: "auto",
            options: ["auto"],
        });
    });

    it("lists models from OpenAI when connected", async () => {
        const ai = createAiBridgeService("/lib", manuscriptFs, {
            userDataPath: "/user",
            settingsFs,
            fetchImpl: modelsFetch,
        });
        await expect(ai.getOpenAiModelSettings()).resolves.toEqual({
            preference: "gpt-4.1",
            options: ["auto", "gpt-4o", "gpt-4.1"],
        });
    });

    it("persists model preference", async () => {
        const ai = createAiBridgeService("/lib", manuscriptFs, {
            userDataPath: "/user",
            settingsFs,
            fetchImpl: modelsFetch,
        });
        await ai.setOpenAiModelPreference("gpt-4o");
        expect(settingsWrites.at(-1)).toMatchObject({ openAiModel: "gpt-4o" });
    });
});
