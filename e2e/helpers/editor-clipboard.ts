import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

async function clickEditorEnd(editor: Locator): Promise<void> {
    const box = await editor.boundingBox();
    if (!box) {
        throw new Error("ProseMirror editor has no layout box");
    }
    await editor.click({
        position: {
            x: Math.max(4, box.width - 8),
            y: Math.max(4, box.height - 8),
        },
    });
}

/**
 * Select all in the ProseMirror field, copy, move to a new paragraph, and paste.
 */
export async function duplicateProseMirrorSelection(
    editor: Locator,
    page: Page,
): Promise<void> {
    await editor.press("ControlOrMeta+a");
    const selected = await editor.evaluate(
        () => window.getSelection()?.toString() ?? "",
    );
    expect(selected.length).toBeGreaterThan(0);

    const copied = await editor.evaluate(() => document.execCommand("copy"));
    expect(copied).toBe(true);

    await clickEditorEnd(editor);
    await editor.press("Enter");
    await page.keyboard.press("ControlOrMeta+v");
}
