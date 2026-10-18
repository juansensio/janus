import path from "node:path";

export type UiBundleDirOptions = {
    isPackaged: boolean;
    resourcesPath: string;
    devDistDir: string;
};

/**
 * Directory containing desktop `index.html` and Vite assets.
 * Packaged: electron-builder `extraResources` → `Resources/ui`.
 * Dev/prod-from-repo: repo-root `dist/ui` relative to built main.
 */
export function resolveUiBundleDir(options: UiBundleDirOptions): string {
    if (options.isPackaged) {
        return path.join(options.resourcesPath, "ui");
    }
    return options.devDistDir;
}
