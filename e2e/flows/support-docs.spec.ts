import { saveFlowScreenshot } from "../helpers/artifacts";
import {
    backToShelf,
    createBook,
    focusEditor,
    openFirstBook,
    waitForShelf,
} from "../helpers/ui";
import { expect, test } from "../fixtures";

test.describe("support docs", () => {
    test("creates worldbuilding, switches docs, and persists", async ({
        janus,
    }, testInfo) => {
        const { page } = janus;
        await waitForShelf(page);
        const title = `Support ${Date.now()}`;
        await createBook(page, title);
        await openFirstBook(page);

        await page.locator('[data-doc="worldbuilding"]').click();
        await expect(page.locator(".editor-support-create-button")).toBeVisible();
        await page.locator(".editor-support-create-button").click();
        await expect(page.locator(".editor-field .ProseMirror")).toBeVisible();

        await focusEditor(page);
        await page.keyboard.type("Ancient kingdoms");
        await expect(page.locator(".editor-status")).toContainText("Saved", {
            timeout: 5000,
        });

        await page.locator('[data-doc="manuscript"]').click();
        await expect(page.locator(".editor-field .ProseMirror")).toBeVisible();

        await page.locator('[data-doc="worldbuilding"]').click();
        await expect(page.locator(".editor-field .ProseMirror")).toContainText(
            "Ancient kingdoms",
        );

        await saveFlowScreenshot(page, testInfo, "support-docs-worldbuilding");
        await backToShelf(page);
        await page.locator(".shelf-card-open", { hasText: title }).click();
        await page.locator('[data-doc="worldbuilding"]').click();
        await expect(page.locator(".editor-field .ProseMirror")).toContainText(
            "Ancient kingdoms",
        );
    });
});
