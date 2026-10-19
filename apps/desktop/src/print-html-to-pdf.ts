import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BrowserWindow } from "electron";

async function waitForLoad(contents: Electron.WebContents): Promise<void> {
    if (!contents.isLoading()) {
        return;
    }
    await new Promise<void>((resolve, reject) => {
        contents.once("did-finish-load", () => resolve());
        contents.once("did-fail-load", (_event, _code, description) => {
            reject(new Error(`Print HTML failed to load: ${description}`));
        });
    });
}

/** Minimal valid PDF for e2e when headless Chromium print hangs. */
export function buildE2eStubPdfBuffer(): Buffer {
    return Buffer.from(
        "%PDF-1.4\n" +
            "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
            "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
            "3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R>>endobj\n" +
            "xref\n0 4\n0000000000 65535 f \n" +
            "trailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF\n",
        "utf8",
    );
}

export async function printHtmlToPdfBuffer(html: string): Promise<Buffer> {
    const tempDir = await mkdtemp(join(tmpdir(), "janus-pdf-"));
    const htmlPath = join(tempDir, "print.html");
    await writeFile(htmlPath, html, "utf8");

    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    try {
        await win.loadFile(htmlPath);
        await waitForLoad(win.webContents);
        const pdf = await win.webContents.printToPDF({
            printBackground: true,
            pageSize: "A4",
            margins: {
                top: 0.5,
                bottom: 0.5,
                left: 0.5,
                right: 0.5,
            },
        });
        return pdf;
    } finally {
        win.destroy();
        await rm(tempDir, { recursive: true, force: true });
    }
}
