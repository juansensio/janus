import type { EditorZoomResult, JanusBridge } from "@janus/bridge";
import {
    resetEditorZoom,
    stepEditorZoom,
} from "@janus/zoom";

export const EDITOR_PAGE_ZOOM_VAR = "--editor-page-zoom";

export function applyEditorPageZoom(
    shell: HTMLElement | null,
    percent: number,
): void {
    if (!shell) {
        return;
    }
    shell.style.setProperty(EDITOR_PAGE_ZOOM_VAR, String(percent / 100));
}

export function findEditorShell(host: HTMLElement): HTMLElement | null {
    return host.closest(".janus-editor-shell");
}

export async function loadAndApplyEditorZoom(
    host: HTMLElement,
    bridge: JanusBridge,
): Promise<EditorZoomResult> {
    const zoom = await bridge.getEditorZoom();
    applyEditorPageZoom(findEditorShell(host), zoom.percent);
    return zoom;
}

export async function persistEditorZoom(
    host: HTMLElement,
    bridge: JanusBridge,
    percent: number,
): Promise<EditorZoomResult> {
    const zoom = await bridge.setEditorZoom(percent);
    applyEditorPageZoom(findEditorShell(host), zoom.percent);
    return zoom;
}

export async function stepPersistedEditorZoom(
    host: HTMLElement,
    bridge: JanusBridge,
    currentPercent: number,
    direction: "in" | "out" | "reset",
): Promise<EditorZoomResult> {
    let next = currentPercent;
    if (direction === "reset") {
        next = resetEditorZoom();
    } else {
        next = stepEditorZoom(currentPercent, direction);
    }
    return persistEditorZoom(host, bridge, next);
}

export type EditorZoomShortcutOptions = {
    getCurrentPercent: () => number;
    setCurrentPercent: (percent: number) => void;
    isActive: () => boolean;
};

export function attachEditorZoomShortcuts(
    bridge: JanusBridge,
    host: HTMLElement,
    options: EditorZoomShortcutOptions,
): () => void {
    const handler = (event: KeyboardEvent) => {
        if (!options.isActive()) {
            return;
        }
        const target = event.target;
        if (target instanceof HTMLSelectElement) {
            return;
        }
        if (!event.metaKey && !event.ctrlKey) {
            return;
        }
        const key = event.key;
        const zoomIn =
            key === "=" || key === "+" || (key === "=" && event.shiftKey);
        const zoomOut = key === "-" || key === "_";
        const reset = key === "0";
        if (!zoomIn && !zoomOut && !reset) {
            return;
        }
        event.preventDefault();
        void (async () => {
            const direction = zoomIn
                ? "in"
                : zoomOut
                  ? "out"
                  : "reset";
            const result = await stepPersistedEditorZoom(
                host,
                bridge,
                options.getCurrentPercent(),
                direction,
            );
            options.setCurrentPercent(result.percent);
        })();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
}
