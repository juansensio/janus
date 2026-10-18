import type { JanusBridge } from "@janus/bridge";
import {
    editorZoomCssFactor,
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
    shell.style.setProperty(
        EDITOR_PAGE_ZOOM_VAR,
        String(editorZoomCssFactor(percent)),
    );
}

export function findEditorShell(host: HTMLElement): HTMLElement | null {
    return host.closest(".janus-editor-shell");
}

export type EditorZoomController = {
    getPercent: () => number;
    applyDirection: (direction: "in" | "out" | "reset") => void;
};

export type CreateEditorZoomControllerOptions = {
    onPersistError?: () => void;
};

export function createEditorZoomController(
    host: HTMLElement,
    bridge: JanusBridge,
    initialPercent: number,
    options: CreateEditorZoomControllerOptions = {},
): EditorZoomController {
    let percent = initialPercent;
    let persistChain: Promise<void> = Promise.resolve();

    const applyLocal = (next: number): void => {
        percent = next;
        applyEditorPageZoom(findEditorShell(host), percent);
    };

    applyLocal(initialPercent);

    const queuePersist = (next: number): void => {
        if (next === percent) {
            return;
        }
        applyLocal(next);
        persistChain = persistChain
            .then(async () => {
                const result = await bridge.setEditorZoom(next);
                applyLocal(result.percent);
            })
            .catch(() => {
                options.onPersistError?.();
            });
        void persistChain;
    };

    return {
        getPercent: () => percent,
        applyDirection: (direction) => {
            const next =
                direction === "reset"
                    ? resetEditorZoom()
                    : stepEditorZoom(percent, direction);
            queuePersist(next);
        },
    };
}

export async function loadInitialEditorZoom(
    host: HTMLElement,
    bridge: JanusBridge,
): Promise<number> {
    try {
        const zoom = await bridge.getEditorZoom();
        applyEditorPageZoom(findEditorShell(host), zoom.percent);
        return zoom.percent;
    } catch {
        const fallback = resetEditorZoom();
        applyEditorPageZoom(findEditorShell(host), fallback);
        return fallback;
    }
}

export type EditorZoomShortcutOptions = {
    controller: EditorZoomController;
    isActive: () => boolean;
};

export function attachEditorZoomShortcuts(
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
        const zoomIn = key === "=" || key === "+";
        const zoomOut = key === "-" || key === "_";
        const reset = key === "0";
        if (!zoomIn && !zoomOut && !reset) {
            return;
        }
        event.preventDefault();
        const direction = zoomIn
            ? "in"
            : zoomOut
              ? "out"
              : "reset";
        options.controller.applyDirection(direction);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
}
