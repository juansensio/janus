/** Guards built UI artifacts for Electron file:// and Capacitor consumption. */

const ABSOLUTE_ASSET_PATTERN = /src=["']\/assets\//;

export function assertBuiltIndexHtml(html: string): void {
    if (!html.includes('id="app"')) {
        throw new Error(
            "validate:install: built index.html missing #app (main id=\"app\")",
        );
    }
    if (ABSOLUTE_ASSET_PATTERN.test(html)) {
        throw new Error(
            "validate:install: built index.html uses absolute asset URL (src=\"/assets/…); set Vite base to './'",
        );
    }
}

export function assertBuiltJsContainsShellLabel(js: string): void {
    if (!js.includes("Janus")) {
        throw new Error(
            "validate:install: built JS bundle missing shell label text Janus",
        );
    }
}
