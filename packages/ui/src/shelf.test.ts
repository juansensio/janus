import { createMockJanusBridge, type BookSummary } from "@janus/bridge";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderShelf } from "./shelf";
import { SHELF_STRINGS } from "./shelf/strings";

afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

function getDialogInput(): HTMLInputElement {
    const input = document.querySelector(
        "#shelf-book-name-input",
    ) as HTMLInputElement;
    if (!input) {
        throw new Error("dialog input not found");
    }
    return input;
}

function clickDialogPrimary(): void {
    const button = document.querySelector(
        ".shelf-dialog-button--primary",
    ) as HTMLButtonElement;
    if (!button) {
        throw new Error("dialog primary button not found");
    }
    button.click();
}

describe("renderShelf", () => {
    it("shows add tile and screen-reader empty state when there are no books", async () => {
        const host = document.createElement("div");
        document.body.append(host);
        const bridge = createMockJanusBridge({
            listBooks: async () => [],
        });

        await renderShelf(host, bridge);

        expect(host.querySelector(".shelf-add")).not.toBeNull();
        expect(host.querySelector(".shelf-empty")?.textContent).toBe(
            SHELF_STRINGS.empty,
        );
        expect(host.querySelector(".shelf-empty")?.classList).toContain(
            "shelf-sr-only",
        );
        expect(host.querySelectorAll(".shelf-card")).toHaveLength(0);
        expect(host.querySelector(".shelf-wordmark")?.textContent).toBe(
            "Janus",
        );
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
        expect(host.querySelector(".shelf-add")).not.toBeNull();
        expect(host.querySelector("a")).toBeNull();
        expect(host.querySelector(".shelf-card-edit")).not.toBeNull();
    });

    it("opens create dialog and calls createBook with title on confirm", async () => {
        const createBook = vi.fn(async () => ({
            id: "550e8400-e29b-41d4-a716-446655440001",
            title: "My Book",
            createdAt: "2026-01-02T00:00:00.000Z",
        }));
        const suggestNewBookTitle = vi.fn(async () => "Untitled");
        const listBooks = vi
            .fn()
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                {
                    id: "550e8400-e29b-41d4-a716-446655440001",
                    title: "My Book",
                    createdAt: "2026-01-02T00:00:00.000Z",
                },
            ]);
        const host = document.createElement("div");
        document.body.append(host);
        const bridge = createMockJanusBridge({
            createBook,
            suggestNewBookTitle,
            listBooks,
        });

        await renderShelf(host, bridge);
        (host.querySelector(".shelf-add") as HTMLButtonElement).click();
        await vi.waitFor(() =>
            expect(document.querySelector(".shelf-dialog")).not.toBeNull(),
        );
        expect(suggestNewBookTitle).toHaveBeenCalledOnce();

        getDialogInput().value = "My Book";
        getDialogInput().dispatchEvent(new Event("input"));
        clickDialogPrimary();

        await vi.waitFor(() =>
            expect(createBook).toHaveBeenCalledWith("My Book"),
        );
        await vi.waitFor(() =>
            expect(host.querySelectorAll(".shelf-card")).toHaveLength(1),
        );
    });

    it("does not call createBook when create dialog is cancelled", async () => {
        const createBook = vi.fn();
        const host = document.createElement("div");
        document.body.append(host);
        const bridge = createMockJanusBridge({
            listBooks: async () => [],
            suggestNewBookTitle: async () => "Untitled",
            createBook,
        });

        await renderShelf(host, bridge);
        (host.querySelector(".shelf-add") as HTMLButtonElement).click();
        await vi.waitFor(() =>
            expect(document.querySelector(".shelf-dialog")).not.toBeNull(),
        );

        (
            document.querySelector(
                ".shelf-dialog-button--ghost",
            ) as HTMLButtonElement
        ).click();

        await vi.waitFor(() =>
            expect(document.querySelector(".shelf-dialog")).toBeNull(),
        );
        expect(createBook).not.toHaveBeenCalled();
    });

    it("rename via edit icon calls renameBook on save", async () => {
        const book: BookSummary = {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Draft",
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        const renameBook = vi.fn(async () => ({
            ...book,
            title: "Renamed",
        }));
        const listBooks = vi
            .fn()
            .mockResolvedValueOnce([book])
            .mockResolvedValueOnce([{ ...book, title: "Renamed" }]);
        const host = document.createElement("div");
        document.body.append(host);
        const bridge = createMockJanusBridge({ listBooks, renameBook });

        await renderShelf(host, bridge);
        (host.querySelector(".shelf-card-edit") as HTMLButtonElement).click();
        await vi.waitFor(() =>
            expect(document.querySelector(".shelf-dialog")).not.toBeNull(),
        );

        getDialogInput().value = "Renamed";
        getDialogInput().dispatchEvent(new Event("input"));
        clickDialogPrimary();

        await vi.waitFor(() =>
            expect(renameBook).toHaveBeenCalledWith(book.id, "Renamed"),
        );
        await vi.waitFor(() =>
            expect(host.querySelector(".shelf-card-title")?.textContent).toBe(
                "Renamed",
            ),
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
            ".shelf-card-delete",
        ) as HTMLButtonElement;
        deleteButton.click();
        await vi.waitFor(() => expect(deleteBook).toHaveBeenCalledWith(book.id));

        expect(confirm).toHaveBeenCalledWith(
            SHELF_STRINGS.deleteConfirm("Draft"),
        );
    });

    it("does not delete when confirm is cancelled", async () => {
        const book: BookSummary = {
            id: "550e8400-e29b-41d4-a716-446655440000",
            title: "Draft",
            createdAt: "2026-01-01T00:00:00.000Z",
        };
        const deleteBook = vi.fn(async () => {});
        const bridge = createMockJanusBridge({
            listBooks: async () => [book],
            deleteBook,
        });
        vi.spyOn(window, "confirm").mockReturnValue(false);
        const host = document.createElement("div");

        await renderShelf(host, bridge);
        const deleteButton = host.querySelector(
            ".shelf-card-delete",
        ) as HTMLButtonElement;
        deleteButton.click();

        expect(deleteBook).not.toHaveBeenCalled();
        expect(host.querySelectorAll(".shelf-card")).toHaveLength(1);
    });

    it("shows load error when listBooks fails", async () => {
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            listBooks: async () => {
                throw new Error("fail");
            },
        });

        await renderShelf(host, bridge);

        expect(host.querySelector(".shelf-error")?.textContent).toBe(
            SHELF_STRINGS.loadFailed,
        );
        expect(host.querySelectorAll(".shelf-card")).toHaveLength(0);
    });

    it("shows create error when createBook fails", async () => {
        const host = document.createElement("div");
        document.body.append(host);
        const bridge = createMockJanusBridge({
            listBooks: async () => [],
            suggestNewBookTitle: async () => "Untitled",
            createBook: async () => {
                throw new Error("fail");
            },
        });

        await renderShelf(host, bridge);
        (host.querySelector(".shelf-add") as HTMLButtonElement).click();
        await vi.waitFor(() =>
            expect(document.querySelector(".shelf-dialog")).not.toBeNull(),
        );
        clickDialogPrimary();
        await vi.waitFor(() =>
            expect(host.querySelector(".shelf-error")?.textContent).toBe(
                SHELF_STRINGS.createFailed,
            ),
        );
    });
});
