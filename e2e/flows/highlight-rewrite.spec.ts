import {
    createBook,
    focusEditor,
    openFirstBook,
    waitForShelf,
} from "../helpers/ui";
import { expect, test } from "../fixtures";

const uniqueTitle = () => `Highlight E2E ${Date.now()}`;

test.describe("highlight rewrite", () => {
    test("rewrite selection inserts rewrite comment", async ({ janus }) => {
        const { page } = janus;
        await waitForShelf(page);
        await createBook(page, uniqueTitle());
        await openFirstBook(page);
        await focusEditor(page);

        const editor = page.locator(".editor-field .ProseMirror");
        await editor.pressSequentially("The old sentence here.");
        await editor.press("ControlOrMeta+a");

        const rewriteButton = page.locator(".editor-rewrite-selection");
        await expect(rewriteButton).toBeVisible();
        await rewriteButton.click();

        await expect(
            page.locator('.editor-ai-comment[data-variant="rewrite"]'),
        ).toBeVisible();
        await expect(page.locator(".editor-ai-comment-body")).toContainText(
            "Rewrite this passage.",
        );
    });
});
