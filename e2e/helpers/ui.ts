import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function waitForShelf(page: Page): Promise<void> {
    await expect(page.locator(".shelf-wordmark")).toBeVisible();
}

export async function createBook(page: Page, title: string): Promise<void> {
    await page.locator(".shelf-add").click();
    const dialog = page.locator(".shelf-dialog");
    await expect(dialog).toBeVisible();
    await page.locator("#shelf-book-name-input").fill(title);
    await page.locator(".shelf-dialog-form").evaluate((form) => {
        form.requestSubmit();
    });
    await expect(dialog).toBeHidden();
    await expect(page.locator(".shelf-card-title", { hasText: title })).toBeVisible();
}

export async function openFirstBook(page: Page): Promise<void> {
    await page.locator(".shelf-card-open").first().click();
    await expect(page.locator(".editor-field")).toBeVisible();
}

export async function backToShelf(page: Page): Promise<void> {
    await page.locator(".editor-back").click();
    await waitForShelf(page);
}

export async function openSettingsFromShelf(page: Page): Promise<void> {
    await page.locator(".shelf-settings").click();
    await expect(page.locator(".settings-title")).toBeVisible();
}

export async function closeSettings(page: Page): Promise<void> {
    await page.locator(".settings-back").click();
    await waitForShelf(page);
}

export async function readEditorZoomBarLabel(page: Page): Promise<string> {
    const label = page.locator(".editor-zoom-label");
    await expect(label).toBeVisible();
    return (await label.textContent()) ?? "";
}

export async function readEditorPageWidth(page: Page): Promise<number> {
    return page.locator(".editor-page").evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width;
    });
}

export async function clickEditorZoomIn(page: Page): Promise<void> {
    await page.locator(".editor-zoom-in").click();
}

export async function readEditorZoomPercent(page: Page): Promise<number> {
    const factor = await page.locator(".janus-editor-shell").evaluate((shell) =>
        shell.style.getPropertyValue("--editor-page-zoom").trim(),
    );
    const parsed = Number.parseFloat(factor);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid --editor-page-zoom value: "${factor}"`);
    }
    return Math.round(parsed * 100);
}

export async function setEditorZoomInSettings(
    page: Page,
    percent: number,
): Promise<void> {
    const select = page.locator(".settings-editor-zoom");
    await expect(select).toBeVisible();
    await select.selectOption(String(percent));
}

export async function focusEditor(page: Page): Promise<void> {
    await page.locator(".editor-field .ProseMirror").click();
}

export async function clickExportPdf(page: Page): Promise<void> {
    await page.locator(".editor-export-pdf").click();
}

export async function typeInEditor(page: Page, text: string): Promise<void> {
    await focusEditor(page);
    await page.keyboard.type(text);
}
