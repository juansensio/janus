export const EDITOR_ZOOM_LEVELS = [
    75, 90, 100, 110, 125, 150, 175, 200,
] as const;

export const EDITOR_ZOOM_DEFAULT = 100;

export type EditorZoomLevel = (typeof EDITOR_ZOOM_LEVELS)[number];

export class InvalidEditorZoomError extends Error {
    readonly code = "INVALID_EDITOR_ZOOM";

    constructor(message = "Invalid editor zoom") {
        super(message);
        this.name = "InvalidEditorZoomError";
    }
}

export function normalizeEditorZoomPercent(raw: unknown): number {
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
        return EDITOR_ZOOM_DEFAULT;
    }
    const rounded = Math.round(raw);
    if (
        (EDITOR_ZOOM_LEVELS as readonly number[]).includes(rounded)
    ) {
        return rounded;
    }
    return EDITOR_ZOOM_DEFAULT;
}

export function assertEditorZoomPercent(percent: unknown): EditorZoomLevel {
    if (typeof percent !== "number" || !Number.isFinite(percent)) {
        throw new InvalidEditorZoomError();
    }
    const rounded = Math.round(percent);
    if (
        !(EDITOR_ZOOM_LEVELS as readonly number[]).includes(rounded)
    ) {
        throw new InvalidEditorZoomError();
    }
    return rounded as EditorZoomLevel;
}

export function stepEditorZoom(
    current: number,
    direction: "in" | "out",
): number {
    const normalized = normalizeEditorZoomPercent(current);
    const index = EDITOR_ZOOM_LEVELS.indexOf(
        normalized as EditorZoomLevel,
    );
    if (index < 0) {
        return EDITOR_ZOOM_DEFAULT;
    }
    if (direction === "in") {
        return EDITOR_ZOOM_LEVELS[
            Math.min(index + 1, EDITOR_ZOOM_LEVELS.length - 1)
        ];
    }
    return EDITOR_ZOOM_LEVELS[Math.max(index - 1, 0)];
}

export function resetEditorZoom(): number {
    return EDITOR_ZOOM_DEFAULT;
}

export function editorZoomCssFactor(percent: number): number {
    return normalizeEditorZoomPercent(percent) / 100;
}
