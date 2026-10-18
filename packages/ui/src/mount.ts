import { createShellLabel, type JanusBridge } from "@janus/bridge";

export function mountJanusShell(root: HTMLElement, bridge: JanusBridge): void {
    root.replaceChildren();
    const heading = document.createElement("h1");
    heading.textContent = createShellLabel();
    root.append(heading);
    root.dataset.platform = bridge.platform();
}
