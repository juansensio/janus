import type { JanusBridge } from "@janus/bridge";
import { mountJanusShell } from "./mount";

declare global {
    interface Window {
        janus?: JanusBridge;
    }
}

async function start(): Promise<void> {
    if (!window.janus) {
        const { installMobileBridge } = await import("@janus/mobile/native-bridge");
        installMobileBridge();
    }

    const root = document.getElementById("app");
    if (!root) {
        throw new Error("Missing #app");
    }

    mountJanusShell(root, window.janus!);
}

start();
