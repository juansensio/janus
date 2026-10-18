import { describe, expect, it } from "vitest";
import {
    allocateUntitledTitle,
    assertTitleNotDuplicate,
    DuplicateBookTitleError,
    InvalidBookTitleError,
    isSkippableListError,
    libraryBooksDir,
    MAX_BOOK_TITLE_LENGTH,
    ManifestParseError,
    normalizeBookTitle,
    bookDirectoryName,
    parseManifest,
    serializeManifest,
    sortBooksForShelf,
    validateBookId,
    type BookSummary,
} from "./index";
import { isResolvedPathInsideRoot } from "./path-containment";

describe("normalizeBookTitle", () => {
    it("trims whitespace", () => {
        expect(normalizeBookTitle("  Hello  ")).toBe("Hello");
    });

    it("rejects empty titles", () => {
        expect(() => normalizeBookTitle("   ")).toThrow(InvalidBookTitleError);
    });

    it("rejects titles over max length", () => {
        const long = "a".repeat(MAX_BOOK_TITLE_LENGTH + 1);
        expect(() => normalizeBookTitle(long)).toThrow(InvalidBookTitleError);
    });
});

describe("assertTitleNotDuplicate", () => {
    const books: BookSummary[] = [
        {
            id: "a",
            title: "Taken",
            createdAt: "2026-01-01T00:00:00.000Z",
        },
    ];

    it("throws when another book has the same title", () => {
        expect(() => assertTitleNotDuplicate("Taken", books)).toThrow(
            DuplicateBookTitleError,
        );
    });

    it("allows the same title when excluding that book id", () => {
        expect(() =>
            assertTitleNotDuplicate("Taken", books, "a"),
        ).not.toThrow();
    });
});

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

    it("rejects non-string ids", () => {
        expect(validateBookId(undefined)).toBe(false);
        expect(validateBookId(null)).toBe(false);
        expect(validateBookId(42)).toBe(false);
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

describe("bookDirectoryName", () => {
    it("uses the title when characters are safe", () => {
        expect(bookDirectoryName("My Novel")).toBe("My Novel");
    });

    it("strips characters unsafe on common filesystems", () => {
        expect(bookDirectoryName('Part 1: "Prologue" / draft')).toBe(
            "Part 1 Prologue draft",
        );
    });

    it("maps dot-only names to Untitled so path.join cannot escape books/", () => {
        expect(bookDirectoryName(".")).toBe("Untitled");
        expect(bookDirectoryName("..")).toBe("Untitled");
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

    it("rejects id mismatch with uuid directory name", () => {
        const json = serializeManifest(valid);
        expect(() =>
            parseManifest(json, "00000000-0000-4000-8000-000000000001"),
        ).toThrow(ManifestParseError);
    });

    it("allows manifest id when directory name is a title", () => {
        const json = serializeManifest(valid);
        expect(parseManifest(json, "My Novel")).toEqual(valid);
    });

    it("marks manifest parse errors as skippable when listing", () => {
        try {
            parseManifest("not json");
        } catch (error) {
            expect(isSkippableListError(error)).toBe(true);
            expect((error as ManifestParseError).code).toBe("MANIFEST_INVALID");
        }
    });

    it("marks ENOENT as skippable when listing", () => {
        expect(
            isSkippableListError(
                Object.assign(new Error("missing"), { code: "ENOENT" }),
            ),
        ).toBe(true);
    });
});

describe("isResolvedPathInsideRoot", () => {
    it("accepts a child path under the books root", () => {
        expect(
            isResolvedPathInsideRoot(
                "/data/library/books/uuid",
                "/data/library/books",
            ),
        ).toBe(true);
    });

    it("rejects paths outside the books root", () => {
        expect(
            isResolvedPathInsideRoot("/tmp/outside", "/data/library/books"),
        ).toBe(false);
    });
});
