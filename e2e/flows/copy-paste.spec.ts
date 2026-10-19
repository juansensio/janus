import { saveFlowScreenshot } from "../helpers/artifacts";
import {
    createBook,
    focusEditor,
    openFirstBook,
    waitForShelf,
} from "../helpers/ui";
import { duplicateProseMirrorSelection } from "../helpers/editor-clipboard";
import { expect, test } from "../fixtures";

test.describe("editor copy and paste", () => {
    test("copies and pastes manuscript text", async ({ janus }, testInfo) => {
        const { page } = janus;
        const phrase = `E2E paste ${Date.now()}`;

        await waitForShelf(page);
        await createBook(page, `Copy ${Date.now()}`);
        await openFirstBook(page);
        await focusEditor(page);

        const editor = page.locator(".editor-field .ProseMirror");
        await editor.pressSequentially(phrase);
        await expect(editor).toContainText(phrase);

        await duplicateProseMirrorSelection(editor, page);

        const editorText = await editor.innerText();
        const occurrences = editorText.split(phrase).length - 1;
        expect(occurrences).toBeGreaterThanOrEqual(2);

        await saveFlowScreenshot(page, testInfo, "copy-paste-success");
    });
});
