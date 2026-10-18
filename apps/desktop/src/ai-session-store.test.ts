import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const userData = path.join("/tmp", `janus-ai-session-test-${process.pid}`);

vi.mock("electron", () => ({
    app: {
        getPath: () => userData,
    },
    safeStorage: {
        isEncryptionAvailable: () => true,
        encryptString: (value: string) => Buffer.from(value, "utf8"),
        decryptString: (buffer: Buffer) => buffer.toString("utf8"),
    },
}));

describe("ai-session-store", () => {
    beforeEach(async () => {
        await fs.rm(userData, { recursive: true, force: true });
    });

    afterEach(async () => {
        await fs.rm(userData, { recursive: true, force: true });
    });

    it("creates and reuses ext_agent_host_id", async () => {
        const store = await import("./ai-session-store");
        const first = await store.loadOrCreateExtAgentHostId();
        const second = await store.loadOrCreateExtAgentHostId();
        expect(first).toMatch(/^urn:uuid:/);
        expect(second).toBe(first);
    });

    it("round-trips SIWC session v2", async () => {
        const store = await import("./ai-session-store");
        const session = store.buildStoredSessionFromTokenResponse({
            clientId: "oaiapp_test",
            extAgentHostId: "urn:uuid:host",
            tokenResponse: {
                access_token: "access",
                refresh_token: "refresh",
                expires_in: 3600,
                scope: "openid chatgpt.tokens.use.direct",
            },
        });
        await store.saveAiSession(session);
        const loaded = await store.loadAiSession();
        expect(loaded).toMatchObject({
            version: 2,
            clientId: "oaiapp_test",
            accessToken: "access",
            refreshToken: "refresh",
        });
        expect(store.sessionHasChatGptDirectScope(session)).toBe(true);
    });

    it("drops legacy v1 sessions without version", async () => {
        const store = await import("./ai-session-store");
        const legacy = {
            provider: "openai-codex",
            accessToken: "old",
            connectedAt: new Date().toISOString(),
        };
        await fs.mkdir(userData, { recursive: true });
        const file = path.join(userData, "ai-openai-session.bin");
        await fs.writeFile(
            file,
            Buffer.from(JSON.stringify(legacy), "utf8"),
        );
        await expect(store.loadAiSession()).resolves.toBeNull();
    });
});
