const DEFAULT_DEV_PORT = 5173;

export function resolveDesktopUiDevUrl(
    port: number = DEFAULT_DEV_PORT,
): string {
    return `http://127.0.0.1:${port}/`;
}

export function resolveDesktopUiLoadTarget(options: {
    devMode: boolean;
    devPort?: number;
    indexHtmlPath: string;
}): { kind: "url"; url: string } | { kind: "file"; path: string } {
    if (options.devMode) {
        return {
            kind: "url",
            url: resolveDesktopUiDevUrl(options.devPort),
        };
    }
    return { kind: "file", path: options.indexHtmlPath };
}
