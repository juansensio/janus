import { ManifestParseError } from "./book-manifest";

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
