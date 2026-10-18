export const MANUSCRIPT_FILENAME = "manuscript.md";

const TEMP_SUFFIX = ".janus-manuscript.tmp";

export type ManuscriptFs = {
    readFile(path: string, encoding: "utf8"): Promise<string>;
    writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
    rename(from: string, to: string): Promise<void>;
    join(...parts: string[]): string;
};

export type ManuscriptErrorCode =
    | "MANUSCRIPT_READ_FAILED"
    | "MANUSCRIPT_WRITE_FAILED";

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

export function createManuscriptService(fs: ManuscriptFs) {
    return {
        async read(bookDir: string): Promise<string> {
            const path = manuscriptPath(fs, bookDir);
            try {
                return await fs.readFile(path, "utf8");
            } catch (error) {
                if (isMissingFileError(error)) {
                    return "";
                }
                throw new ManuscriptServiceError(
                    "MANUSCRIPT_READ_FAILED",
                    "Could not read manuscript",
                );
            }
        },

        async write(bookDir: string, text: string): Promise<void> {
            const path = manuscriptPath(fs, bookDir);
            const tempPath = `${path}${TEMP_SUFFIX}`;
            try {
                await fs.writeFile(tempPath, text, "utf8");
                await fs.rename(tempPath, path);
            } catch {
                throw new ManuscriptServiceError(
                    "MANUSCRIPT_WRITE_FAILED",
                    "Could not write manuscript",
                );
            }
        },
    };
}
