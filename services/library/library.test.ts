import { describe, expect, it } from "vitest";
import {
    allocateUntitledTitle,
    isSkippableListError,
    libraryBooksDir,
    ManifestParseError,
    parseManifest,
    serializeManifest,
    sortBooksForShelf,
    validateBookId,
    type BookSummary,
} from "./index";

describe("allocateUntitledTitle", () => {
    it('returns "Untitled" when no titles exist', () => {
        expect(allocateUntitledTitle([])).toBe("Untitled");
    });

    it('returns "Untitled 2" when "Untitled" is taken', () => {
        expect(allocateUntitledTitle(["Untitled"])).toBe("Untitled 2");
    });

    it("fills gaps in the Untitled N sequence", () => {
        expect(allocateUntitledTitle(["Untitled", "Untitled 3"])).toBe(
            "Untitled 2",
        );
    });
});

describe("sortBooksForShelf", () => {
    const books: BookSummary[] = [
        { id: "b", title: "B", createdAt: "2026-01-02T00:00:00.000Z" },
        { id: "a", title: "A", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "c", title: "C", createdAt: "2026-01-01T00:00:00.000Z" },
    ];

    it("sorts by createdAt ascending then id lexicographic", () => {
        expect(sortBooksForShelf(books).map((b) => b.id)).toEqual([
            "a",
            "c",
            "b",
        ]);
    });
});

describe("validateBookId", () => {
    it("accepts a lowercase uuid", () => {
        expect(
            validateBookId("550e8400-e29b-41d4-a716-446655440000"),
        ).toBe(true);
    });

    it("rejects path traversal and slashes", () => {
        expect(validateBookId("..")).toBe(false);
        expect(validateBookId("../etc")).toBe(false);
        expect(validateBookId("a/b")).toBe(false);
        expect(validateBookId("a\\b")).toBe(false);
    });
});

describe("libraryBooksDir", () => {
    it("appends books under the library root", () => {
        expect(libraryBooksDir("/data/janus/library")).toBe(
            "/data/janus/library/books",
        );
    });

    it("trims a trailing slash on the root", () => {
        expect(libraryBooksDir("/data/janus/library/")).toBe(
            "/data/janus/library/books",
        );
    });
});

describe("book manifest", () => {
    const valid = {
        version: 1,
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Untitled",
        createdAt: "2026-10-18T10:00:00.000Z",
    };

    it("round-trips through serialize and parse", () => {
        const json = serializeManifest(valid);
        expect(parseManifest(json)).toEqual(valid);
    });

    it("rejects invalid JSON", () => {
        expect(() => parseManifest("{")).toThrow(ManifestParseError);
    });

    it("rejects wrong schema version", () => {
        expect(() =>
            parseManifest(JSON.stringify({ ...valid, version: 2 })),
        ).toThrow(ManifestParseError);
    });

    it("rejects id mismatch with directory name", () => {
        const json = serializeManifest(valid);
        expect(() =>
            parseManifest(json, "00000000-0000-4000-8000-000000000001"),
        ).toThrow(ManifestParseError);
    });

    it("marks manifest parse errors as skippable when listing", () => {
        try {
            parseManifest("not json");
        } catch (error) {
            expect(isSkippableListError(error)).toBe(true);
            expect((error as ManifestParseError).code).toBe("MANIFEST_INVALID");
        }
    });
});
