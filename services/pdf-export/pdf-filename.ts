const MAX_FILENAME_LENGTH = 120;

const UNSAFE_FILENAME_CHARS = new Set(
    '<>:"/\\|?*'.split(""),
);

function stripUnsafeFilenameChars(value: string): string {
    let out = "";
    for (const char of value) {
        const code = char.codePointAt(0) ?? 0;
        if (code < 32) {
            continue;
        }
        if (UNSAFE_FILENAME_CHARS.has(char)) {
            continue;
        }
        out += char;
    }
    return out;
}

export function suggestedPdfFilename(bookTitle: string): string {
    const trimmed = bookTitle.trim() || "Untitled";
    const withoutUnsafe = stripUnsafeFilenameChars(trimmed);
    const collapsed = withoutUnsafe.replace(/\s+/g, " ").trim();
    const base =
        collapsed.slice(0, MAX_FILENAME_LENGTH).trim() || "Untitled";
    return `${base}.pdf`;
}
