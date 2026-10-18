/** Guards built UI artifacts for Electron file:// and Capacitor consumption. */

const ABSOLUTE_ASSET_PATTERN = /(?:src|href)=["']\/assets\//;

export function assertBuiltShellHtml(html: string, fileLabel: string): void {
    if (!html.includes('id="app"')) {
        throw new Error(
            `validate:install: ${fileLabel} missing #app (main id="app")`,
        );
    }
    if (ABSOLUTE_ASSET_PATTERN.test(html)) {
        throw new Error(
            `validate:install: ${fileLabel} uses absolute asset URL (src or href="/assets/…"); set Vite base to './'`,
        );
    }
}

/** @deprecated Use assertBuiltShellHtml with a file label. */
export function assertBuiltIndexHtml(html: string): void {
    assertBuiltShellHtml(html, "built index.html");
}

/** Mount path markers from createShellLabel + mountJanusShell (survives minification). */
const SHELL_MOUNT_MARKERS = ["dataset.platform", "data-platform"] as const;

export function assertBuiltJsContainsShellLabel(js: string): void {
    const hasMountMarker = SHELL_MOUNT_MARKERS.some((marker) =>
        js.includes(marker),
    );
    const hasLabel = js.includes("Janus");
    if (!hasMountMarker || !hasLabel) {
        throw new Error(
            "validate:install: built JS missing shell mount path (expected Janus label and data-platform mount markers)",
        );
    }
}
