import fs from "node:fs/promises";
import path from "node:path";
import { app, safeStorage } from "electron";

export type StoredAiSession = {
    provider: "openai-codex";
    accessToken: string;
    connectedAt: string;
};

function sessionPath(): string {
    return path.join(app.getPath("userData"), "ai-openai-session.bin");
}

export async function loadAiSession(): Promise<StoredAiSession | null> {
    try {
        const encrypted = await fs.readFile(sessionPath());
        if (!safeStorage.isEncryptionAvailable()) {
            return null;
        }
        const json = safeStorage.decryptString(encrypted);
        return JSON.parse(json) as StoredAiSession;
    } catch {
        return null;
    }
}

export async function saveAiSession(session: StoredAiSession): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("Encryption is not available");
    }
    const encrypted = safeStorage.encryptString(JSON.stringify(session));
    await fs.writeFile(sessionPath(), encrypted);
}

export async function clearAiSession(): Promise<void> {
    try {
        await fs.rm(sessionPath());
    } catch {
        // ignore missing file
    }
}
