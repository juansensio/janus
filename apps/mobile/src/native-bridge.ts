import { createMockJanusBridge, type JanusBridge } from "@janus/bridge";

declare global {
    interface Window {
        janus?: JanusBridge;
    }
}

export function installMobileBridge(): void {
    window.janus = createMockJanusBridge({ platform: () => "mobile" });
}
