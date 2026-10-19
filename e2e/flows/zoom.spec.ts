import { saveFlowScreenshot } from "../helpers/artifacts";
import { zoomShortcut } from "../helpers/keyboard";
import {
    backToShelf,
    clickEditorZoomIn,
    closeSettings,
    createBook,
    focusEditor,
    openFirstBook,
    openSettingsFromShelf,
    readEditorPageWidth,
    readEditorZoomBarLabel,
    readEditorZoomPercent,
    setEditorZoomInSettings,
    waitForShelf,
} from "../helpers/ui";
import { expect, test } from "../fixtures";

const uniqueTitle = () => `Zoom E2E ${Date.now()}`;

async function screenshotZoom(
    page: import("@playwright/test").Page,
    testInfo: import("@playwright/test").TestInfo,
    label: string,
    percent: number,
): Promise<void> {
    await expect.poll(() => readEditorZoomPercent(page)).toBe(percent);
    await saveFlowScreenshot(page, testInfo, `zoom-${percent}-percent-${label}`);
}

test.describe("editor zoom", () => {
    test("keyboard shortcuts and settings persistence", async ({ janus }, testInfo) => {
        const { page, relaunch } = janus;
        await waitForShelf(page);
        await createBook(page, uniqueTitle());
        await openFirstBook(page);
        await focusEditor(page);

        await expect.poll(() => readEditorZoomPercent(page)).toBe(100);
        await saveFlowScreenshot(page, testInfo, "zoom-100-percent-baseline");

        const widthAt100 = await readEditorPageWidth(page);
        await clickEditorZoomIn(page);
        await expect.poll(() => readEditorZoomPercent(page)).toBe(110);
        expect(await readEditorZoomBarLabel(page)).toMatch(/110\s*%/);
        const widthAt110 = await readEditorPageWidth(page);
        expect(widthAt110).toBeGreaterThan(widthAt100 * 1.05);

        await page.keyboard.press(zoomShortcut("out"));
        await expect.poll(() => readEditorZoomPercent(page)).toBe(100);

        while ((await readEditorZoomPercent(page)) > 75) {
            await page.keyboard.press(zoomShortcut("out"));
        }
        await screenshotZoom(page, testInfo, "keyboard", 75);

        await page.keyboard.press(zoomShortcut("reset"));
        await screenshotZoom(page, testInfo, "keyboard", 100);

        while ((await readEditorZoomPercent(page)) < 200) {
            await page.keyboard.press(zoomShortcut("in"));
        }
        await screenshotZoom(page, testInfo, "keyboard", 200);

        await backToShelf(page);
        await openSettingsFromShelf(page);
        await setEditorZoomInSettings(page, 125);
        await closeSettings(page);
        await openFirstBook(page);
        await expect.poll(() => readEditorZoomPercent(page)).toBe(125);

        await backToShelf(page);
        await openSettingsFromShelf(page);
        await setEditorZoomInSettings(page, 200);
        await closeSettings(page);
        await openFirstBook(page);
        await screenshotZoom(page, testInfo, "settings", 200);

        await backToShelf(page);
        const relaunched = await relaunch();
        await waitForShelf(relaunched);
        await openFirstBook(relaunched);
        await screenshotZoom(relaunched, testInfo, "after-relaunch", 200);
    });
});
