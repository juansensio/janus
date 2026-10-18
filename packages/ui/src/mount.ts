import type { JanusBridge } from "@janus/bridge";
import { renderShelf } from "./shelf";

export function mountJanusShell(root: HTMLElement, bridge: JanusBridge): void {
    root.replaceChildren();
    root.classList.add("janus-shelf-shell");
    root.dataset.platform = bridge.platform();

    const shelfHost = document.createElement("section");
    shelfHost.className = "janus-shelf";
    shelfHost.setAttribute("aria-label", "Bookshelf");
    root.append(shelfHost);

    void renderShelf(shelfHost, bridge);
}
