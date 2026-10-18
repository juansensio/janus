import { createShellLabel, type BookSummary, type JanusBridge } from "@janus/bridge";
import { openBookNameDialog } from "./book-name-dialog";
import { coverClassForBookId } from "./cover-palette";
import { SHELF_STRINGS } from "./strings";

function appendShelfError(host: HTMLElement, message: string): void {
    host.querySelector(".shelf-error")?.remove();
    const error = document.createElement("p");
    error.className = "shelf-error";
    error.textContent = message;
    host.append(error);
}

function createDeleteIcon(): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bar.setAttribute("x", "3");
    bar.setAttribute("y", "7");
    bar.setAttribute("width", "10");
    bar.setAttribute("height", "2");
    bar.setAttribute("fill", "currentColor");
    svg.append(bar);
    return svg;
}

function createEditIcon(): SVGSVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
        "d",
        "M11.5 2.5l2 2L5 13H3v-2L11.5 2.5zM10.5 3.5L4 10v1h1l6.5-6.5-1-1z",
    );
    path.setAttribute("fill", "currentColor");
    svg.append(path);
    return svg;
}

function appendShelfChrome(host: HTMLElement): void {
    const header = document.createElement("header");
    header.className = "shelf-header";
    const wordmark = document.createElement("h1");
    wordmark.className = "shelf-wordmark";
    wordmark.textContent = createShellLabel();
    header.append(wordmark);
    host.append(header);
}

function appendAddTile(
    track: HTMLUListElement,
    host: HTMLElement,
    bridge: JanusBridge,
): void {
    const addItem = document.createElement("li");
    addItem.setAttribute("role", "listitem");
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "shelf-add";
    addButton.textContent = "+";
    addButton.setAttribute("aria-label", SHELF_STRINGS.addBook);
    addButton.addEventListener("click", () => {
        void bridge.suggestNewBookTitle().then((initialValue) => {
            openBookNameDialog({
                mode: "create",
                initialValue,
                returnFocusTo: addButton,
                onConfirm: async (title) => {
                    await refreshAfterAction(
                        host,
                        bridge,
                        () => bridge.createBook(title),
                        SHELF_STRINGS.createFailed,
                    );
                },
            });
        });
    });
    addItem.append(addButton);
    track.append(addItem);
}

async function refreshAfterAction(
    host: HTMLElement,
    bridge: JanusBridge,
    action: () => Promise<unknown>,
    failureMessage: string,
): Promise<void> {
    try {
        await action();
        await renderShelf(host, bridge);
    } catch {
        await renderShelf(host, bridge);
        appendShelfError(host, failureMessage);
    }
}

export async function renderShelf(
    host: HTMLElement,
    bridge: JanusBridge,
): Promise<void> {
    host.replaceChildren();
    appendShelfChrome(host);

    let books: BookSummary[] = [];
    try {
        books = await bridge.listBooks();
    } catch {
        const error = document.createElement("p");
        error.className = "shelf-error";
        error.textContent = SHELF_STRINGS.loadFailed;
        host.append(error);
        return;
    }

    const row = document.createElement("section");
    row.className = "shelf-row";

    const rowLabel = document.createElement("p");
    rowLabel.className = "shelf-row-label";
    rowLabel.textContent = SHELF_STRINGS.shelfLabel;
    row.append(rowLabel);

    if (books.length === 0) {
        const empty = document.createElement("p");
        empty.className = "shelf-empty shelf-sr-only";
        empty.textContent = SHELF_STRINGS.empty;
        row.append(empty);
    }

    const track = document.createElement("ul");
    track.className = "shelf-track";
    track.setAttribute("role", "list");
    row.append(track);

    for (const book of books) {
        const item = document.createElement("li");
        item.setAttribute("role", "listitem");

        const card = document.createElement("article");
        card.className = `shelf-card ${coverClassForBookId(book.id)}`;
        card.setAttribute("title", book.title);

        const title = document.createElement("h2");
        title.className = "shelf-card-title";
        title.textContent = book.title;
        card.append(title);

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "shelf-card-edit";
        editButton.setAttribute(
            "aria-label",
            `${SHELF_STRINGS.rename} ${book.title}`,
        );
        editButton.append(createEditIcon());
        editButton.addEventListener("click", () => {
            openBookNameDialog({
                mode: "rename",
                initialValue: book.title,
                returnFocusTo: editButton,
                onConfirm: async (newTitle) => {
                    await refreshAfterAction(
                        host,
                        bridge,
                        () => bridge.renameBook(book.id, newTitle),
                        SHELF_STRINGS.renameFailed,
                    );
                },
            });
        });
        card.append(editButton);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "shelf-card-delete";
        deleteButton.setAttribute(
            "aria-label",
            `${SHELF_STRINGS.delete} ${book.title}`,
        );
        deleteButton.append(createDeleteIcon());
        deleteButton.addEventListener("click", () => {
            const confirmed = window.confirm(
                SHELF_STRINGS.deleteConfirm(book.title),
            );
            if (!confirmed) {
                return;
            }
            void refreshAfterAction(
                host,
                bridge,
                () => bridge.deleteBook(book.id),
                SHELF_STRINGS.deleteFailed,
            );
        });
        card.append(deleteButton);
        item.append(card);
        track.append(item);
    }

    appendAddTile(track, host, bridge);
    host.append(row);
}
