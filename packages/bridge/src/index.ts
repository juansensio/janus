export type Platform = "desktop" | "mobile";

export interface JanusBridge {
    platform(): Platform;
}

export function createShellLabel(): string {
    return "Janus";
}
