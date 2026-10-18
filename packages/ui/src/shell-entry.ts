import "./styles/shelf.css";
import "./styles/editor.css";
import "./styles/settings.css";
import { startShell } from "./bootstrap";

void startShell().catch((err) => {
    console.error("[Janus shell]", err);
});
