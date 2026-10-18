import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AiAssistError } from "@janus/ai-assist";
import { createAiBridgeService } from "./ai-service";
import * as aiSessionStore from "./ai-session-store";

describe("createAiBridgeService", () => {
    beforeEach(() => {
        vi.spyOn(aiSessionStore, "loadAiSession").mockResolvedValue(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("reports disconnected without a session", async () => {
        const ai = createAiBridgeService("/lib", {
            join: (...parts) => parts.join("/"),
            readFile: async () => {
                throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
            },
            writeFile: async () => {},
            rename: async () => {},
            realpath: async (p) => p,
            mkdir: async () => {},
            readdir: async () => [],
            stat: async () => ({ isDirectory: () => true }),
        });
        await expect(ai.getAiProviderStatus()).resolves.toEqual({
            connected: false,
        });
    });

    it("writeForComment requires connection", async () => {
        const ai = createAiBridgeService("/lib", {
            join: (...parts) => parts.join("/"),
            readFile: async () => "",
            writeFile: async () => {},
            rename: async () => {},
            realpath: async (p) => p,
            mkdir: async () => {},
            readdir: async () => [],
            stat: async () => ({ isDirectory: () => true }),
        });
        await expect(
            ai.writeForComment("550e8400-e29b-41d4-a716-446655440000", "c1", "en"),
        ).rejects.toMatchObject({ code: "AI_NOT_CONNECTED" });
    });
});
