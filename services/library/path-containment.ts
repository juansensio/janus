/** True when `resolvedPath` is a strict child of `resolvedRoot`. */
export function isResolvedPathInsideRoot(
    resolvedPath: string,
    resolvedRoot: string,
): boolean {
    if (resolvedPath === resolvedRoot) {
        return false;
    }
    const prefix = resolvedRoot.endsWith("/")
        ? resolvedRoot
        : `${resolvedRoot}/`;
    return resolvedPath.startsWith(prefix);
}
