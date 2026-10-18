/** Primary modifier for Janus desktop shortcuts (Cmd on macOS, Ctrl elsewhere). */
export function shortcutMod(): "Meta" | "Control" {
    return process.platform === "darwin" ? "Meta" : "Control";
}

export function zoomShortcut(
    action: "in" | "out" | "reset",
): string {
    const mod = shortcutMod();
    if (action === "in") {
        return `${mod}+=`;
    }
    if (action === "out") {
        return `${mod}+-`;
    }
    return `${mod}+0`;
}
