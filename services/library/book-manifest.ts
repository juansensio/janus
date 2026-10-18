import { validateBookId } from "./validate-book-id";

export const MANIFEST_VERSION = 1;

export type BookManifest = {
    version: 1;
    id: string;
    title: string;
    createdAt: string;
};

export type BookSummary = {
    id: string;
    title: string;
    createdAt: string;
};

export class ManifestParseError extends Error {
    readonly code = "MANIFEST_INVALID";
    readonly skipOnList = true;

    constructor(message: string) {
        super(message);
        this.name = "ManifestParseError";
    }
}

function isIsoDateTime(value: string): boolean {
    const time = Date.parse(value);
    return Number.isFinite(time);
}

function assertManifestRecord(
    value: unknown,
): Record<string, unknown> | null {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    return value as Record<string, unknown>;
}

export function parseManifest(
    raw: string,
    bookIdFromDir?: string,
): BookManifest {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new ManifestParseError("book.json is not valid JSON");
    }

    const record = assertManifestRecord(parsed);
    if (!record) {
        throw new ManifestParseError("book.json must be an object");
    }

    if (record.version !== MANIFEST_VERSION) {
        throw new ManifestParseError("unsupported book.json version");
    }

    const id = record.id;
    const title = record.title;
    const createdAt = record.createdAt;

    if (typeof id !== "string" || !validateBookId(id)) {
        throw new ManifestParseError("book.json id is invalid");
    }

    if (bookIdFromDir !== undefined && id !== bookIdFromDir) {
        throw new ManifestParseError("book.json id does not match directory");
    }

    if (typeof title !== "string" || title.length === 0) {
        throw new ManifestParseError("book.json title is invalid");
    }

    if (typeof createdAt !== "string" || !isIsoDateTime(createdAt)) {
        throw new ManifestParseError("book.json createdAt is invalid");
    }

    return {
        version: MANIFEST_VERSION,
        id,
        title,
        createdAt,
    };
}

export function serializeManifest(manifest: BookManifest): string {
    return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function manifestToSummary(manifest: BookManifest): BookSummary {
    return {
        id: manifest.id,
        title: manifest.title,
        createdAt: manifest.createdAt,
    };
}
