export { allocateUntitledTitle } from "./titles";
export {
    MANIFEST_VERSION,
    ManifestParseError,
    manifestToSummary,
    parseManifest,
    serializeManifest,
    type BookManifest,
    type BookSummary,
} from "./book-manifest";
export { validateBookId } from "./validate-book-id";

import type { BookSummary } from "./book-manifest";
import { ManifestParseError } from "./book-manifest";

export function sortBooksForShelf(books: BookSummary[]): BookSummary[] {
    return [...books].sort((a, b) => {
        const byCreated = a.createdAt.localeCompare(b.createdAt);
        if (byCreated !== 0) {
            return byCreated;
        }
        return a.id.localeCompare(b.id);
    });
}

export function libraryBooksDir(libraryRoot: string): string {
    const trimmed = libraryRoot.replace(/[/\\]+$/, "");
    return `${trimmed}/books`;
}

export function isSkippableListError(error: unknown): boolean {
    if (error instanceof ManifestParseError) {
        return error.skipOnList;
    }
    if (
        error !== null &&
        typeof error === "object" &&
        "skipOnList" in error &&
        (error as { skipOnList?: unknown }).skipOnList === true
    ) {
        return true;
    }
    return false;
}
