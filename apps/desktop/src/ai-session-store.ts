import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { app, safeStorage } from "electron";

const SESSION_VERSION = 2;
const CHATGPT_DIRECT_SCOPE = "chatgpt.tokens.use.direct";

export type StoredAiSession = {
    provider: "openai-codex";
    version: typeof SESSION_VERSION;
    clientId: string;
    extAgentHostId: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    idToken?: string;
    email?: string;
    subject?: string;
    scopes: string[];
    connectedAt: string;
};

/** Dev-only session when `JANUS_OPENAI_ACCESS_TOKEN` is set (no refresh). */
export type DevOverrideAiSession = {
    provider: "openai-codex";
    version: "dev-override";
    accessToken: string;
    connectedAt: string;
};

export type AnyStoredAiSession = StoredAiSession | DevOverrideAiSession;

function sessionPath(): string {
    return path.join(app.getPath("userData"), "ai-openai-session.bin");
}

function hostIdPath(): string {
    return path.join(app.getPath("userData"), "ai-openai-host-id.bin");
}

function encryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
}

async function readEncryptedJson(filePath: string): Promise<unknown | null> {
    try {
        const encrypted = await fs.readFile(filePath);
        if (!encryptionAvailable()) {
            return null;
        }
        const json = safeStorage.decryptString(encrypted);
        return JSON.parse(json) as unknown;
    } catch {
        return null;
    }
}

async function writeEncryptedJson(
    filePath: string,
    value: unknown,
): Promise<void> {
    if (!encryptionAvailable()) {
        throw new Error("Encryption is not available");
    }
    const encrypted = safeStorage.encryptString(JSON.stringify(value));
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, encrypted, { mode: 0o600 });
}

function parseScopes(scope: string | string[] | undefined): string[] {
    if (Array.isArray(scope)) {
        return scope;
    }
    if (typeof scope === "string" && scope.length > 0) {
        return scope.split(/\s+/);
    }
    return [];
}

function normalizeSession(raw: unknown): AnyStoredAiSession | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const record = raw as Record<string, unknown>;
    if (record.provider !== "openai-codex") {
        return null;
    }
    if (record.version === "dev-override") {
        if (typeof record.accessToken !== "string") {
            return null;
        }
        return {
            provider: "openai-codex",
            version: "dev-override",
            accessToken: record.accessToken,
            connectedAt:
                typeof record.connectedAt === "string"
                    ? record.connectedAt
                    : new Date().toISOString(),
        };
    }
    if (record.version === SESSION_VERSION) {
        if (
            typeof record.clientId !== "string" ||
            typeof record.extAgentHostId !== "string" ||
            typeof record.accessToken !== "string" ||
            typeof record.refreshToken !== "string" ||
            typeof record.accessTokenExpiresAt !== "string"
        ) {
            return null;
        }
        return {
            provider: "openai-codex",
            version: SESSION_VERSION,
            clientId: record.clientId,
            extAgentHostId: record.extAgentHostId,
            accessToken: record.accessToken,
            refreshToken: record.refreshToken,
            accessTokenExpiresAt: record.accessTokenExpiresAt,
            idToken:
                typeof record.idToken === "string" ? record.idToken : undefined,
            email: typeof record.email === "string" ? record.email : undefined,
            subject:
                typeof record.subject === "string" ? record.subject : undefined,
            scopes: parseScopes(record.scopes as string | string[]),
            connectedAt:
                typeof record.connectedAt === "string"
                    ? record.connectedAt
                    : new Date().toISOString(),
        };
    }
    // Legacy v1 (accessToken only) — no refresh; require re-connect via SIWC.
    if (
        typeof record.accessToken === "string" &&
        record.version === undefined
    ) {
        return null;
    }
    return null;
}

export async function loadOrCreateExtAgentHostId(): Promise<string> {
    const existing = await readEncryptedJson(hostIdPath());
    if (
        typeof existing === "object" &&
        existing !== null &&
        typeof (existing as { extAgentHostId?: unknown }).extAgentHostId ===
            "string"
    ) {
        return (existing as { extAgentHostId: string }).extAgentHostId;
    }
    const extAgentHostId = `urn:uuid:${randomUUID()}`;
    await writeEncryptedJson(hostIdPath(), { extAgentHostId });
    return extAgentHostId;
}

export async function loadAiSession(): Promise<AnyStoredAiSession | null> {
    const raw = await readEncryptedJson(sessionPath());
    return normalizeSession(raw);
}

export async function saveAiSession(session: AnyStoredAiSession): Promise<void> {
    await writeEncryptedJson(sessionPath(), session);
}

export async function clearAiSession(): Promise<void> {
    try {
        await fs.rm(sessionPath());
    } catch {
        // ignore missing file
    }
}

export function isDevOverrideSession(
    session: AnyStoredAiSession,
): session is DevOverrideAiSession {
    return session.version === "dev-override";
}

export function sessionHasChatGptDirectScope(session: StoredAiSession): boolean {
    return session.scopes.includes(CHATGPT_DIRECT_SCOPE);
}

export function isAccessTokenExpired(
    session: StoredAiSession,
    skewMs = 60_000,
): boolean {
    const expiresAt = Date.parse(session.accessTokenExpiresAt);
    if (Number.isNaN(expiresAt)) {
        return true;
    }
    return Date.now() + skewMs >= expiresAt;
}

export function accessTokenExpiresAtFromExpiresIn(
    expiresInSeconds: number,
): string {
    return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

export function buildStoredSessionFromTokenResponse(
    input: {
        clientId: string;
        extAgentHostId: string;
        tokenResponse: {
            access_token: string;
            refresh_token: string;
            expires_in: number;
            scope?: string;
            id_token?: string;
        };
        email?: string;
        subject?: string;
    },
): StoredAiSession {
    const scopes = parseScopes(input.tokenResponse.scope);
    return {
        provider: "openai-codex",
        version: SESSION_VERSION,
        clientId: input.clientId,
        extAgentHostId: input.extAgentHostId,
        accessToken: input.tokenResponse.access_token,
        refreshToken: input.tokenResponse.refresh_token,
        accessTokenExpiresAt: accessTokenExpiresAtFromExpiresIn(
            input.tokenResponse.expires_in,
        ),
        idToken: input.tokenResponse.id_token,
        email: input.email,
        subject: input.subject,
        scopes,
        connectedAt: new Date().toISOString(),
    };
}
