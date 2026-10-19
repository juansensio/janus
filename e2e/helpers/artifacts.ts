import fs from "node:fs/promises";
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { artifactsDir } from "./paths";

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export function flowArtifactDir(testInfo: TestInfo): string {
    const flow = slugify(testInfo.titlePath.join("-"));
    return path.join(artifactsDir, flow);
}

export async function saveFlowScreenshot(
    page: Page,
    testInfo: TestInfo,
    name: string,
): Promise<string> {
    const dir = flowArtifactDir(testInfo);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${slugify(name)}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    return filePath;
}

export async function saveFailureArtifacts(
    page: Page,
    testInfo: TestInfo,
): Promise<void> {
    const dir = flowArtifactDir(testInfo);
    await fs.mkdir(dir, { recursive: true });
    await page.screenshot({
        path: path.join(dir, "failure.png"),
        fullPage: true,
    });
    const tracePath = testInfo.outputPath("trace.zip");
    try {
        await fs.access(tracePath);
        await fs.copyFile(tracePath, path.join(dir, "trace.zip"));
    } catch {
        // trace may not exist if failure happened before trace was written
    }
}
