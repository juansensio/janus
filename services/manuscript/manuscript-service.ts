import {
    createEmptyManuscriptHtml,
    migrateLegacyMarkdownToHtml,
} from "./manuscript-html";

export const MANUSCRIPT_FILENAME = "manuscript.html";
export const LEGACY_MANUSCRIPT_FILENAME = "manuscript.md";

const TEMP_SUFFIX = ".janus-manuscript.tmp";

export type ManuscriptFs = {
    readFile(path: string, encoding: "utf8"): Promise<string>;
    writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    join(...parts: string[]): string;
};

export type ManuscriptErrorCode =
    | "MANUSCRIPT_READ_FAILED"
    | "MANUSCRIPT_WRITE_FAILED"
    | "MANUSCRIPT_INVALID";

export class ManuscriptServiceError extends Error {
    readonly code: ManuscriptErrorCode;

    constructor(code: ManuscriptErrorCode, message: string) {
        super(message);
        this.name = "ManuscriptServiceError";
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

function manuscriptPath(fs: ManuscriptFs, bookDir: string): string {
    return fs.join(bookDir, MANUSCRIPT_FILENAME);
}

function legacyManuscriptPath(fs: ManuscriptFs, bookDir: string): string {
    return fs.join(bookDir, LEGACY_MANUSCRIPT_FILENAME);
}

async function writeAtomic(
    fs: ManuscriptFs,
    path: string,
    text: string,
): Promise<void> {
    const tempPath = `${path}${TEMP_SUFFIX}`;
    await fs.writeFile(tempPath, text, "utf8");
    await fs.rename(tempPath, path);
}

export function createManuscriptService(fs: ManuscriptFs) {
    return {
        async read(bookDir: string): Promise<string> {
            const htmlPath = manuscriptPath(fs, bookDir);
            try {
                return await fs.readFile(htmlPath, "utf8");
            } catch (error) {
                if (!isMissingFileError(error)) {
                    throw new ManuscriptServiceError(
                        "MANUSCRIPT_READ_FAILED",
                        "Could not read manuscript",
                    );
                }
            }

            const legacyPath = legacyManuscriptPath(fs, bookDir);
            try {
                const markdown = await fs.readFile(legacyPath, "utf8");
                const html = migrateLegacyMarkdownToHtml(markdown);
                try {
                    await writeAtomic(fs, htmlPath, html);
                } catch {
                    throw new ManuscriptServiceError(
                        "MANUSCRIPT_WRITE_FAILED",
                        "Could not write manuscript",
                    );
                }
                return html;
            } catch (error) {
                if (isMissingFileError(error)) {
                    return createEmptyManuscriptHtml();
                }
                throw new ManuscriptServiceError(
                    "MANUSCRIPT_READ_FAILED",
                    "Could not read manuscript",
                );
            }
        },

        async write(bookDir: string, text: string): Promise<void> {
            const path = manuscriptPath(fs, bookDir);
            try {
                await writeAtomic(fs, path, text);
            } catch {
                throw new ManuscriptServiceError(
                    "MANUSCRIPT_WRITE_FAILED",
                    "Could not write manuscript",
                );
            }
        },
    };
}
