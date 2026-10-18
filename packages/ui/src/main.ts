import { startShell } from "./bootstrap";

async function installMobileBridgeFromApp(): Promise<void> {
    const { installMobileBridge } = await import("@janus/mobile/native-bridge");
    installMobileBridge();
}

void startShell({ installMobileBridge: installMobileBridgeFromApp }).catch(
    (err) => {
        console.error("[Janus shell]", err);
    },
);
