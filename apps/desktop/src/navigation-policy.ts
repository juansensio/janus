import path from "node:path";

export type NavigationPolicyOptions = {
    /** Repo-root dist/ui directory (normalized absolute path). */
    uiBundleDir: string;
    /** When true, allow http(s)/ws to localhost for Vite HMR. */
    devMode?: boolean;
};

export type NavigationDecision = "allow" | "deny";

function normalizePath(filePath: string): string {
    return path.normalize(filePath);
}

function isUnderBundleDir(filePath: string, bundleDir: string): boolean {
    const resolved = normalizePath(filePath);
    const base = normalizePath(bundleDir);
    const relative = path.relative(base, resolved);
    return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function evaluateNavigationUrl(
    url: string,
    options: NavigationPolicyOptions,
): NavigationDecision {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return "deny";
    }

    if (options.devMode) {
        const host = parsed.hostname;
        if (
            (parsed.protocol === "http:" || parsed.protocol === "https:") &&
            (host === "127.0.0.1" || host === "localhost")
        ) {
            return "allow";
        }
        if (parsed.protocol === "ws:" || parsed.protocol === "wss:") {
            if (host === "127.0.0.1" || host === "localhost") {
                return "allow";
            }
        }
    }

    if (parsed.protocol === "file:") {
        const filePath = decodeURIComponent(parsed.pathname);
        const onDisk =
            process.platform === "win32" && filePath.startsWith("/")
                ? filePath.slice(1)
                : filePath;
        return isUnderBundleDir(onDisk, options.uiBundleDir) ? "allow" : "deny";
    }

    return "deny";
}

export function evaluateWindowOpen(
    _url: string,
    _options: NavigationPolicyOptions,
): NavigationDecision {
    return "deny";
}
