import {
    EDITOR_ZOOM_DEFAULT,
    EDITOR_ZOOM_LEVELS,
    normalizeEditorZoomPercent,
} from "@janus/zoom";

export type EditorZoomResult = {
    percent: number;
    levels: readonly number[];
};

export function buildEditorZoomResult(
    savedPercent?: number,
): EditorZoomResult {
    return {
        percent: normalizeEditorZoomPercent(
            savedPercent ?? EDITOR_ZOOM_DEFAULT,
        ),
        levels: EDITOR_ZOOM_LEVELS,
    };
}
