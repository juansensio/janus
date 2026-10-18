import { createMockJanusBridge, type BookSummary } from "@janus/bridge";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderShelf } from "./shelf";
import { SHELF_STRINGS } from "./shelf/strings";

afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

describe("renderShelf", () => {
    it("shows empty state and New book control", async () => {
        const host = document.createElement("div");
        document.body.append(host);
        const bridge = createMockJanusBridge({
            listBooks: async () => [],
        });

        await renderShelf(host, bridge);

        expect(host.querySelector("button")?.textContent).toBe(
            SHELF_STRINGS.newBook,
        );
        expect(host.querySelector(".shelf-empty")?.textContent).toBe(
            SHELF_STRINGS.empty,
        );
        expect(host.querySelectorAll(".shelf-card")).toHaveLength(0);
    });

    it("renders a card per book without links", async () => {
        const books: BookSummary[] = [
            {
                id: "550e8400-e29b-41d4-a716-446655440000",
                title: "Draft",
                createdAt: "2026-01-01T00:00:00.000Z",
            },
        ];
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            listBooks: async () => books,
        });

        await renderShelf(host, bridge);

        expect(host.querySelectorAll(".shelf-card")).toHaveLength(1);
        expect(host.querySelector(".shelf-card-title")?.textContent).toBe(
            "Draft",
        );
        expect(host.querySelector("a")).toBeNull();
    });

    it("calls createBook when New book is pressed", async () => {
        const createBook = vi.fn(async () => ({
            id: "550e8400-e29b-41d4-a716-446655440001",
            title: "Untitled",
            createdAt: "2026-01-02T00:00:00.000Z",
        }));
        const listBooks = vi
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                {
                    id: "550e8400-e29b-41d4-a716-446655440001",
                    title: "Untitled",
                    createdAt: "2026-01-02T00:00:00.000Z",
                },
            ]);
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({ createBook, listBooks });

        await renderShelf(host, bridge);
        host.querySelector("button")?.click();
        await vi.waitFor(() => expect(createBook).toHaveBeenCalledOnce());
        await vi.waitFor(() =>
            expect(host.querySelectorAll(".shelf-card")).toHaveLength(1),
        );
    });

    it("confirms before delete", async () => {
        const book: BookSummary = {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Draft",
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        const deleteBook = vi.fn(async () => {});
        const listBooks = vi
            .fn()
            .mockResolvedValueOnce([book])
            .mockResolvedValueOnce([]);
        const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({ deleteBook, listBooks });

        await renderShelf(host, bridge);
        const deleteButton = host.querySelector(
            ".shelf-card button",
        ) as HTMLButtonElement;
        deleteButton.click();
        await vi.waitFor(() => expect(deleteBook).toHaveBeenCalledWith(book.id));

        expect(confirm).toHaveBeenCalledWith(
            SHELF_STRINGS.deleteConfirm("Draft"),
        );
    });
});
