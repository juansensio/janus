import { startShell } from "./bootstrap";

void startShell().catch((err) => {
    console.error("[Janus shell]", err);
});
