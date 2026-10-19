import fs from "node:fs/promises";
import {
    clickExportPdf,
    createBook,
    openFirstBook,
    typeInEditor,
    waitForShelf,
} from "../helpers/ui";
import { expect, test } from "../fixtures";

const uniqueTitle = () => `PDF E2E ${Date.now()}`;

test.describe("pdf export", () => {
    test("exports open manuscript to PDF via auto save path", async ({
        janus,
    }) => {
        const { page, dirs } = janus;
        await waitForShelf(page);
        await createBook(page, uniqueTitle());
        await openFirstBook(page);
        await typeInEditor(page, "Hello PDF export");
        await clickExportPdf(page);
        await expect
            .poll(async () => {
                try {
                    const stat = await fs.stat(dirs.autoPdfExportPath);
                    return stat.size;
                } catch {
                    return 0;
                }
            })
            .toBeGreaterThan(100);
    });
});
