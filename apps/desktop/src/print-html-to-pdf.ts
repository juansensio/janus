import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BrowserWindow } from "electron";

export async function printHtmlToPdfBuffer(html: string): Promise<Buffer> {
    const tempDir = await mkdtemp(join(tmpdir(), "janus-pdf-"));
    const htmlPath = join(tempDir, "print.html");
    await writeFile(htmlPath, html, "utf8");

    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    try {
        await win.loadFile(htmlPath);
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
