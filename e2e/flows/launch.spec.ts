import { saveFlowScreenshot } from "../helpers/artifacts";
import { waitForShelf } from "../helpers/ui";
import { expect, test } from "../fixtures";

test.describe("app launch", () => {
    test("shows the library shelf", async ({ janus }, testInfo) => {
        const { page } = janus;
        await waitForShelf(page);
        await expect(page.locator(".shelf-add")).toBeVisible();
        await saveFlowScreenshot(page, testInfo, "shelf-library");
    });
});
