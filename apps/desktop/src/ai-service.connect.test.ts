import { afterEach, describe, expect, it, vi } from "vitest";
import * as aiSessionStore from "./ai-session-store";
import { createAiBridgeService } from "./ai-service";

vi.mock("electron", () => ({
    shell: { openExternal: vi.fn() },
}));

describe("createAiBridgeService connect", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it("stores dev override session when env token is set", async () => {
        vi.stubEnv("JANUS_OPENAI_ACCESS_TOKEN", "dev-token");
        const save = vi
            .spyOn(aiSessionStore, "saveAiSession")
            .mockResolvedValue();
        const fs = {
            join: (...parts: string[]) => parts.join("/"),
            readFile: async () => {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            },
            writeFile: async () => {},
            rename: async () => {},
            realpath: async (p: string) => p,
            mkdir: async () => {},
            readdir: async () => [],
            stat: async () => ({ isDirectory: () => true }),
        };
        const ai = createAiBridgeService("/lib", fs);
        await ai.connectOpenAiCodex();
        expect(save).toHaveBeenCalledWith(
            expect.objectContaining({
                version: "dev-override",
                accessToken: "dev-token",
            }),
        );
    });

    it("ignores dev override when allowDevOpenAiTokenOverride is false", async () => {
        vi.stubEnv("JANUS_OPENAI_ACCESS_TOKEN", "dev-token");
        const save = vi
            .spyOn(aiSessionStore, "saveAiSession")
            .mockResolvedValue();
        const connectSiwc = vi.fn().mockResolvedValue(undefined);
        const fs = {
            join: (...parts: string[]) => parts.join("/"),
            readFile: async () => {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            },
            writeFile: async () => {},
            rename: async () => {},
            realpath: async (p: string) => p,
            mkdir: async () => {},
            readdir: async () => [],
            stat: async () => ({ isDirectory: () => true }),
        };
        const ai = createAiBridgeService("/lib", fs, {
            connectSiwc,
            allowDevOpenAiTokenOverride: false,
        });
        await ai.connectOpenAiCodex();
        expect(save).not.toHaveBeenCalled();
        expect(connectSiwc).toHaveBeenCalledOnce();
    });

    it("runs SIWC connect when env override is absent", async () => {
        const connectSiwc = vi.fn().mockResolvedValue(undefined);
        const fs = {
            join: (...parts: string[]) => parts.join("/"),
            readFile: async () => "",
            writeFile: async () => {},
            rename: async () => {},
            realpath: async (p: string) => p,
            mkdir: async () => {},
            readdir: async () => [],
            stat: async () => ({ isDirectory: () => true }),
        };
        const ai = createAiBridgeService("/lib", fs, { connectSiwc });
        await ai.connectOpenAiCodex();
        expect(connectSiwc).toHaveBeenCalledOnce();
    });
});
