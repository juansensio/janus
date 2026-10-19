import { EDITOR_ZOOM_LEVELS } from "@janus/zoom";
import { t } from "../i18n";
import type { EditorZoomController } from "./editor-zoom";

const MIN_ZOOM = EDITOR_ZOOM_LEVELS[0];
const MAX_ZOOM = EDITOR_ZOOM_LEVELS[EDITOR_ZOOM_LEVELS.length - 1];

export type EditorZoomBarHandle = {
    sync: (percent: number) => void;
    dispose: () => void;
};

export function mountEditorZoomBar(
    host: HTMLElement,
    controller: EditorZoomController,
): EditorZoomBarHandle {
    const bar = document.createElement("footer");
    bar.className = "editor-zoom-bar";

    const zoomIn = document.createElement("button");
    zoomIn.type = "button";
    zoomIn.className = "editor-zoom-in";
    zoomIn.textContent = "+";
    zoomIn.setAttribute("aria-label", t("manuscript.editorZoomIn"));

    const label = document.createElement("span");
    label.className = "editor-zoom-label";

    const zoomOut = document.createElement("button");
    zoomOut.type = "button";
    zoomOut.className = "editor-zoom-out";
    zoomOut.textContent = "−";
    zoomOut.setAttribute("aria-label", t("manuscript.editorZoomOut"));

    const sync = (percent: number): void => {
        label.textContent = t("manuscript.editorZoomBar", {
            percent: String(percent),
        });
        zoomOut.disabled = percent <= MIN_ZOOM;
        zoomIn.disabled = percent >= MAX_ZOOM;
    };

    sync(controller.getPercent());

    zoomIn.addEventListener("click", () => {
        controller.applyDirection("in");
    });
    zoomOut.addEventListener("click", () => {
        controller.applyDirection("out");
    });

    bar.append(zoomIn, label, zoomOut);
    host.append(bar);

    return {
        sync,
        dispose: () => {
            bar.remove();
        },
    };
}
