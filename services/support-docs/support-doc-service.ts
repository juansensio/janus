import {
    editorHtmlToPlainText,
    isEditorHtmlSupportDocSafe,
    plainTextToEditorHtml,
} from "./editor-binding";
import {
    assertSupportDocKind,
    SUPPORT_DOC_KINDS,
    supportDocRelativePath,
    type SupportDocKind,
} from "./support-doc-kinds";

const TEMP_SUFFIX = ".janus-support-doc.tmp";

export type SupportDocFs = {
    readFile(path: string, encoding: "utf8"): Promise<string>;
    writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    stat(path: string): Promise<{ isFile(): boolean }>;
    join(...parts: string[]): string;
};

export type SupportDocSummary = {
    kind: SupportDocKind;
    exists: boolean;
};

export type SupportDocErrorCode =
    | "INVALID_SUPPORT_DOC_KIND"
    | "SUPPORT_DOC_NOT_FOUND"
    | "SUPPORT_DOC_ALREADY_EXISTS"
    | "SUPPORT_DOC_READ_FAILED"
    | "SUPPORT_DOC_WRITE_FAILED"
    | "SUPPORT_DOC_INVALID";

export class SupportDocServiceError extends Error {
    readonly code: SupportDocErrorCode;

    constructor(code: SupportDocErrorCode, message: string) {
        super(message);
        this.name = "SupportDocServiceError";
        this.code = code;
    }
}

function isMissingFileError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: unknown }).code === "ENOENT"
    );
}

function supportDir(fs: SupportDocFs, bookDir: string): string {
    return fs.join(bookDir, "support");
}

function supportDocPath(
    fs: SupportDocFs,
    bookDir: string,
    kind: SupportDocKind,
): string {
    return fs.join(bookDir, supportDocRelativePath(kind));
}

async function writeAtomic(
    fs: SupportDocFs,
    path: string,
    text: string,
): Promise<void> {
    const tempPath = `${path}${TEMP_SUFFIX}`;
    await fs.writeFile(tempPath, text, "utf8");
    await fs.rename(tempPath, path);
}

async function fileExists(fs: SupportDocFs, path: string): Promise<boolean> {
    try {
        const stat = await fs.stat(path);
        return stat.isFile();
    } catch (error) {
        if (isMissingFileError(error)) {
            return false;
        }
        throw error;
    }
}

function wrapInvalidKind(error: unknown): never {
    if (
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: unknown }).code === "INVALID_SUPPORT_DOC_KIND"
    ) {
        throw new SupportDocServiceError(
            "INVALID_SUPPORT_DOC_KIND",
            "Invalid support document kind",
        );
    }
    throw error;
}

export function createSupportDocService(fs: SupportDocFs) {
    return {
        async listSupportDocsForBook(
            bookDir: string,
        ): Promise<SupportDocSummary[]> {
            const summaries: SupportDocSummary[] = [];
            for (const kind of SUPPORT_DOC_KINDS) {
                const path = supportDocPath(fs, bookDir, kind);
                summaries.push({
                    kind,
                    exists: await fileExists(fs, path),
                });
            }
            return summaries;
        },

        async createSupportDoc(
            bookDir: string,
            kindRaw: string,
        ): Promise<SupportDocSummary> {
            let kind: SupportDocKind;
            try {
                kind = assertSupportDocKind(kindRaw);
            } catch (error) {
                wrapInvalidKind(error);
            }
            const path = supportDocPath(fs, bookDir, kind);
            if (await fileExists(fs, path)) {
                throw new SupportDocServiceError(
                    "SUPPORT_DOC_ALREADY_EXISTS",
                    "Support document already exists",
                );
            }
            try {
                await fs.mkdir(supportDir(fs, bookDir), { recursive: true });
                await writeAtomic(fs, path, "");
            } catch {
                throw new SupportDocServiceError(
                    "SUPPORT_DOC_WRITE_FAILED",
                    "Could not create support document",
                );
            }
            return { kind, exists: true };
        },

        async readSupportDocEditorHtml(
            bookDir: string,
            kindRaw: string,
        ): Promise<string> {
            let kind: SupportDocKind;
            try {
                kind = assertSupportDocKind(kindRaw);
            } catch (error) {
                wrapInvalidKind(error);
            }
            const path = supportDocPath(fs, bookDir, kind);
            let plain: string;
            try {
                plain = await fs.readFile(path, "utf8");
            } catch (error) {
                if (isMissingFileError(error)) {
                    throw new SupportDocServiceError(
                        "SUPPORT_DOC_NOT_FOUND",
                        "Support document not found",
                    );
                }
                throw new SupportDocServiceError(
                    "SUPPORT_DOC_READ_FAILED",
                    "Could not read support document",
                );
            }
            return plainTextToEditorHtml(plain);
        },

        async writeSupportDocFromEditorHtml(
            bookDir: string,
            kindRaw: string,
            editorHtml: string,
        ): Promise<void> {
            let kind: SupportDocKind;
            try {
                kind = assertSupportDocKind(kindRaw);
            } catch (error) {
                wrapInvalidKind(error);
            }
            if (!isEditorHtmlSupportDocSafe(editorHtml)) {
                throw new SupportDocServiceError(
                    "SUPPORT_DOC_INVALID",
                    "Support document content is invalid",
                );
            }
            const path = supportDocPath(fs, bookDir, kind);
            if (!(await fileExists(fs, path))) {
                throw new SupportDocServiceError(
                    "SUPPORT_DOC_NOT_FOUND",
                    "Support document not found",
                );
            }
            const plain = editorHtmlToPlainText(editorHtml);
            try {
                await writeAtomic(fs, path, plain);
            } catch {
                throw new SupportDocServiceError(
                    "SUPPORT_DOC_WRITE_FAILED",
                    "Could not write support document",
                );
            }
        },
    };
}
