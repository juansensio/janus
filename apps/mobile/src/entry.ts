import { startShell } from "@janus/ui/bootstrap";
import { installMobileBridge } from "./native-bridge";

installMobileBridge();

void startShell().catch((err) => {
    console.error("[Janus shell]", err);
});
