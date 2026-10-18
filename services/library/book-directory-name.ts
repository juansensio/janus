import { MAX_BOOK_TITLE_LENGTH } from "./book-title";

const FORBIDDEN_CHARS = /[/\\:*?"<>|]/g;

/** Maps a shelf title to a single-level directory name under `books/`. */
export function bookDirectoryName(title: string): string {
    let name = title.replace(FORBIDDEN_CHARS, "").replace(/\s+/g, " ").trim();
    if (name.length === 0) {
        name = "Untitled";
    }
    if (name.length > MAX_BOOK_TITLE_LENGTH) {
        name = name.slice(0, MAX_BOOK_TITLE_LENGTH).trim();
    }
    if (name.length === 0) {
        name = "Untitled";
    }
    return name;
}
