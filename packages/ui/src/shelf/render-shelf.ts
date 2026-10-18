import type { BookSummary, JanusBridge } from "@janus/bridge";
import { SHELF_STRINGS } from "./strings";

export async function renderShelf(
    host: HTMLElement,
    bridge: JanusBridge,
): Promise<void> {
    host.replaceChildren();
    const toolbar = document.createElement("div");
    toolbar.className = "shelf-toolbar";
    const newButton = document.createElement("button");
    newButton.type = "button";
    newButton.textContent = SHELF_STRINGS.newBook;
    newButton.addEventListener("click", () => {
        void bridge.createBook().then(() => renderShelf(host, bridge));
    });
    toolbar.append(newButton);
    host.append(toolbar);

    const grid = document.createElement("div");
    grid.className = "shelf-grid";
    grid.setAttribute("role", "list");
    host.append(grid);

    let books: BookSummary[] = [];
    try {
        books = await bridge.listBooks();
    } catch {
        const error = document.createElement("p");
        error.textContent = "Could not load books.";
        host.append(error);
        return;
    }

    if (books.length === 0) {
        const empty = document.createElement("p");
        empty.className = "shelf-empty";
        empty.textContent = SHELF_STRINGS.empty;
        host.append(empty);
        return;
    }

    for (const book of books) {
        const card = document.createElement("article");
        card.className = "shelf-card";
        card.setAttribute("role", "listitem");

        const title = document.createElement("h2");
        title.className = "shelf-card-title";
        title.textContent = book.title;
        card.append(title);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = SHELF_STRINGS.delete;
        deleteButton.setAttribute(
            "aria-label",
            `${SHELF_STRINGS.delete} ${book.title}`,
        );
        deleteButton.addEventListener("click", () => {
            const confirmed = window.confirm(
                SHELF_STRINGS.deleteConfirm(book.title),
            );
            if (!confirmed) {
                return;
            }
            void bridge.deleteBook(book.id).then(() =>
                renderShelf(host, bridge),
            );
        });
        card.append(deleteButton);
        grid.append(card);
    }
}
