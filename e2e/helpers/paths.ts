import path from "node:path";

/** Playwright runs with cwd at the repository root. */
export const repoRoot = process.cwd();
export const desktopAppDir = path.join(repoRoot, "apps", "desktop");
export const artifactsDir = path.join(repoRoot, "e2e", "artifacts");
