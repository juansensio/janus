import type { JanusBridge } from "@janus/bridge";

declare global {
    interface Window {
        janus?: JanusBridge;
    }
}

export function installMobileBridge(): void {
    const bridge: JanusBridge = {
        platform: () => "mobile",
    };
    window.janus = bridge;
}
