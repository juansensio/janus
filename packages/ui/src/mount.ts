import type { BookSummary, JanusBridge } from "@janus/bridge";
import { renderEditor } from "./editor";
import { renderSettings } from "./settings";
import { renderShelf } from "./shelf";

export function mountJanusShell(root: HTMLElement, bridge: JanusBridge): void {
    function showShelf(): void {
        root.replaceChildren();
        root.classList.remove("janus-editor-shell", "janus-settings-shell");
        root.classList.add("janus-shelf-shell");
        root.dataset.platform = bridge.platform();

        const shelfHost = document.createElement("section");
        shelfHost.className = "janus-shelf";
        shelfHost.setAttribute("aria-label", "Bookshelf");
        root.append(shelfHost);

        void renderShelf(shelfHost, bridge, {
            onOpenBook: (book) => {
                showEditor(book);
            },
            onOpenSettings:
                bridge.platform() === "desktop" ? () => showSettings() : undefined,
        });
    }

    function showSettings(): void {
        root.replaceChildren();
        root.classList.remove("janus-shelf-shell", "janus-editor-shell");
        root.classList.add("janus-settings-shell");
        root.dataset.platform = bridge.platform();

        const settingsHost = document.createElement("div");
        settingsHost.className = "janus-settings-host";
        root.append(settingsHost);

        void renderSettings(settingsHost, bridge, {
            onBack: () => {
                showShelf();
            },
        });
    }

    function showEditor(book: BookSummary): void {
        root.replaceChildren();
        root.classList.remove("janus-shelf-shell");
        root.classList.add("janus-editor-shell");
        root.dataset.platform = bridge.platform();

        const editorHost = document.createElement("div");
        editorHost.className = "janus-editor-host";
        root.append(editorHost);

        void renderEditor(editorHost, bridge, book, {
            onBack: () => {
                showShelf();
            },
        });
    }

    showShelf();
}
