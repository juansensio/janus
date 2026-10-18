import type { BookSummary } from "./book-manifest";

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
