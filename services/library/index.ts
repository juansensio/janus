export {
    assertTitleNotDuplicate,
    DuplicateBookTitleError,
    InvalidBookTitleError,
    MAX_BOOK_TITLE_LENGTH,
    normalizeBookTitle,
} from "./book-title";
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
export { bookDirectoryName } from "./book-directory-name";
export { resolveBookDirById } from "./resolve-book-dir";
export { migrateLegacyUuidBookDirectories } from "./migrate-legacy-uuid-dirs";
export { libraryBooksDir, sortBooksForShelf } from "./shelf-utils";
export {
    createShelfService,
    type ShelfFs,
    type ShelfService,
} from "./shelf-service";
export { ShelfServiceError, type ShelfServiceErrorCode } from "./shelf-errors";

export { isSkippableListError } from "./list-errors";
