import { MAX_BOOK_TITLE_LENGTH } from "./book-title";

const FORBIDDEN_CHARS = /[/\\:*?"<>|]/g;

const RESERVED_DIRECTORY_NAMES = new Set([".", ".."]);

function isReservedDirectoryName(name: string): boolean {
    return RESERVED_DIRECTORY_NAMES.has(name);
}

/** Maps a shelf title to a single-level directory name under `books/`. */
export function bookDirectoryName(title: string): string {
    let name = title.replace(FORBIDDEN_CHARS, "").replace(/\s+/g, " ").trim();
    if (name.length === 0 || isReservedDirectoryName(name)) {
        name = "Untitled";
    }
    if (name.length > MAX_BOOK_TITLE_LENGTH) {
        name = name.slice(0, MAX_BOOK_TITLE_LENGTH).trim();
    }
    if (name.length === 0 || isReservedDirectoryName(name)) {
        name = "Untitled";
    }
    return name;
}

/** Picks a directory name under `books/` that is not already in `taken`. */
export function uniqueDirectoryName(
    base: string,
    taken: ReadonlySet<string>,
): string {
    if (!taken.has(base)) {
        return base;
    }
    let n = 2;
    while (taken.has(`${base} ${n}`)) {
        n += 1;
    }
    return `${base} ${n}`;
}

export function allocateBookDirectoryName(
    title: string,
    taken: ReadonlySet<string>,
): string {
    return uniqueDirectoryName(bookDirectoryName(title), taken);
}
