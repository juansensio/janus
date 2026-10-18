import type { JanusBridge } from "@janus/bridge";
import { mountJanusShell } from "./mount";

declare global {
    interface Window {
        janus?: JanusBridge;
    }
}

export function isElectronShell(): boolean {
    return /Electron/i.test(navigator.userAgent);
}

export type BootstrapOptions = {
    installMobileBridge?: () => void | Promise<void>;
};

export async function resolveJanusBridge(
    options: BootstrapOptions = {},
): Promise<JanusBridge> {
    if (window.janus) {
        return window.janus;
    }
    if (isElectronShell()) {
        throw new Error(
            "Missing window.janus: desktop preload must expose the Janus bridge",
        );
    }
    if (!options.installMobileBridge) {
        throw new Error(
            "Missing window.janus: set the bridge before loading the shell (Capacitor/mobile entry)",
        );
    }
    await options.installMobileBridge();
    if (!window.janus) {
        throw new Error(
            "Missing window.janus after mobile bridge install",
        );
    }
    return window.janus;
}

export async function startShell(
    options: BootstrapOptions = {},
): Promise<void> {
    const bridge = await resolveJanusBridge(options);
    const root = document.getElementById("app");
    if (!root) {
        throw new Error("Missing #app");
    }
    mountJanusShell(root, bridge);
}
