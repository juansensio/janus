import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ipcMain } from "electron";
import { createLibraryService, type LibraryFs } from "./library-service";
import { PDF_EXPORT_IPC_CHANNELS } from "./pdf-export-ipc-channels";
import { registerPdfExportIpc } from "./pdf-export-ipc";

vi.mock("./print-html-to-pdf", async (importOriginal) => {
    const actual = await importOriginal<typeof import("./print-html-to-pdf")>();
    return {
        ...actual,
        printHtmlToPdfBuffer: async () => Buffer.from("%PDF-mock"),
    };
});

function nodeLibraryFs(): LibraryFs {
    return {
        mkdir: (p, options) => fs.mkdir(p, options),
        readdir: (p, options) =>
            fs.readdir(p, options as { withFileTypes?: boolean }),
        readFile: (p, encoding) => fs.readFile(p, encoding),
        writeFile: (p, data, encoding) => fs.writeFile(p, data, encoding),
        rm: (p, options) => fs.rm(p, options),
        stat: (p) => fs.stat(p),
        realpath: (p) => fs.realpath(p),
        rename: (from, to) => fs.rename(from, to),
    };
}

describe("pdf export IPC", () => {
    let root: string;
    let autoPdfPath: string;
    let exportHandler: (...args: unknown[]) => Promise<unknown>;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-pdf-ipc-"));
        autoPdfPath = path.join(root, "out.pdf");
        process.env.JANUS_E2E_AUTO_PDF_PATH = autoPdfPath;
        const handlers = new Map<string, (...args: unknown[]) => unknown>();
        const mockIpc = {
            handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
                handlers.set(channel, handler);
            },
        };
        registerPdfExportIpc(
            mockIpc as typeof ipcMain,
            () => root,
            nodeLibraryFs(),
            nodeLibraryFs(),
        );
        const handler = handlers.get(PDF_EXPORT_IPC_CHANNELS.exportManuscriptPdf);
        if (!handler) {
            throw new Error("export handler missing");
        }
        exportHandler = handler;
    });

    afterEach(async () => {
        delete process.env.JANUS_E2E_AUTO_PDF_PATH;
        await fs.rm(root, { recursive: true, force: true });
    });

    it("writes PDF to JANUS_E2E_AUTO_PDF_PATH", async () => {
        const library = createLibraryService(
            root,
            nodeLibraryFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );
        const book = await library.createBook("Export Test");
        const result = await exportHandler({}, book.id);
        expect(result).toEqual({ outcome: "saved", path: autoPdfPath });
        const bytes = await fs.readFile(autoPdfPath);
        expect(bytes.length).toBeGreaterThan(0);
    });
});
