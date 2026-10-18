import { saveFlowScreenshot } from "../helpers/artifacts";
import { shortcutMod } from "../helpers/keyboard";
import {
    createBook,
    focusEditor,
    openFirstBook,
    waitForShelf,
} from "../helpers/ui";
import { expect, test } from "../fixtures";

test.describe("editor copy and paste", () => {
    test("copies and pastes manuscript text", async ({ janus }, testInfo) => {
        const { page } = janus;
        const phrase = `E2E paste ${Date.now()}`;
        const mod = shortcutMod();

        await waitForShelf(page);
        await createBook(page, `Copy ${Date.now()}`);
        await openFirstBook(page);
        await focusEditor(page);

        await page.keyboard.type(phrase);
        await expect(page.locator(".editor-field .ProseMirror")).toContainText(
            phrase,
        );

        await page.keyboard.press(`${mod}+a`);
        await page.keyboard.press(`${mod}+c`);
        await page.keyboard.press("End");
        await page.keyboard.press("Enter");
        await page.keyboard.press(`${mod}+v`);

        const editorText = await page
            .locator(".editor-field .ProseMirror")
            .innerText();
        const occurrences = editorText.split(phrase).length - 1;
        expect(occurrences).toBeGreaterThanOrEqual(2);

        await saveFlowScreenshot(page, testInfo, "copy-paste-success");
    });
});
