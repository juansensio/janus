import { createShellLabel, type JanusBridge } from "@janus/bridge";
import { renderShelf } from "./shelf";

export function mountJanusShell(root: HTMLElement, bridge: JanusBridge): void {
    root.replaceChildren();
    root.dataset.platform = bridge.platform();

    const heading = document.createElement("h1");
    heading.textContent = createShellLabel();
    root.append(heading);

    const shelfHost = document.createElement("section");
    shelfHost.className = "janus-shelf";
    shelfHost.setAttribute("aria-label", "Bookshelf");
    root.append(shelfHost);

    void renderShelf(shelfHost, bridge);
}
