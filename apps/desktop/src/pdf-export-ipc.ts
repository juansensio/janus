import fs from "node:fs/promises";
import type { IpcMain, SaveDialogOptions } from "electron";
import { dialog } from "electron";
import {
    buildManuscriptPrintHtml,
    suggestedPdfFilename,
} from "@janus/pdf-export";
import { ManuscriptServiceError } from "@janus/manuscript";
import { createLibraryService, type LibraryFs } from "./library-service";
import { LibraryBridgeError, toBridgeRejectValue } from "./library-errors";
import {
    isLibraryIpcReject,
    toLibraryIpcReject,
    type LibraryIpcReject,
} from "./library-ipc-error";
import {
    createManuscriptBridgeService,
    type ManuscriptBridgeFs,
} from "./manuscript-service";
import { printHtmlToPdfBuffer } from "./print-html-to-pdf";
import { PDF_EXPORT_IPC_CHANNELS } from "./pdf-export-ipc-channels";

export { PDF_EXPORT_IPC_CHANNELS };

export type PdfExportResult =
    | { outcome: "saved"; path: string }
    | { outcome: "cancelled" };

function rejectForBridge(error: unknown): LibraryIpcReject {
    if (isLibraryIpcReject(error)) {
        return error;
    }
    const mapped =
        error instanceof ManuscriptServiceError
            ? { message: error.message, code: error.code }
            : toBridgeRejectValue(error);
    return toLibraryIpcReject(mapped.message, mapped.code);
}

async function resolveBookTitle(
    libraryRoot: string,
    bookId: string,
    fs: LibraryFs,
): Promise<string> {
    const books = await createLibraryService(libraryRoot, fs).listBooks();
    const book = books.find((row) => row.id === bookId);
    if (!book) {
        throw new LibraryBridgeError("BOOK_NOT_FOUND", "Book not found");
    }
    return book.title;
}

export function registerPdfExportIpc(
    ipcMain: IpcMain,
    getLibraryRoot: () => string,
    libraryFs: LibraryFs,
    manuscriptFs: ManuscriptBridgeFs,
): void {
    ipcMain.handle(
        PDF_EXPORT_IPC_CHANNELS.exportManuscriptPdf,
        async (_event, bookId: unknown): Promise<PdfExportResult> => {
            if (typeof bookId !== "string") {
                throw rejectForBridge(
                    new LibraryBridgeError("INVALID_BOOK_ID", "Invalid book id"),
                );
            }
            const libraryRoot = getLibraryRoot();
            try {
                const title = await resolveBookTitle(
                    libraryRoot,
                    bookId,
                    libraryFs,
                );
                const manuscriptHtml = await createManuscriptBridgeService(
                    libraryRoot,
                    manuscriptFs,
                ).readManuscript(bookId);
                const printHtml = buildManuscriptPrintHtml({
                    title,
                    manuscriptHtml,
                });
                const pdf = await printHtmlToPdfBuffer(printHtml);

                const autoPath = process.env.JANUS_E2E_AUTO_PDF_PATH?.trim();
                if (autoPath) {
                    await fs.writeFile(autoPath, pdf);
                    return { outcome: "saved", path: autoPath };
                }

                const defaultName = suggestedPdfFilename(title);
                const dialogOptions: SaveDialogOptions = {
                    title: "Export PDF",
                    defaultPath: defaultName,
                    filters: [{ name: "PDF", extensions: ["pdf"] }],
                };
                const { canceled, filePath } =
                    await dialog.showSaveDialog(dialogOptions);
                if (canceled || !filePath) {
                    return { outcome: "cancelled" };
                }
                const normalizedPath = filePath.endsWith(".pdf")
                    ? filePath
                    : `${filePath}.pdf`;
                await fs.writeFile(normalizedPath, pdf);
                return { outcome: "saved", path: normalizedPath };
            } catch (error) {
                if (
                    error instanceof LibraryBridgeError ||
                    error instanceof ManuscriptServiceError
                ) {
                    throw rejectForBridge(error);
                }
                throw rejectForBridge(
                    Object.assign(new Error("PDF export failed"), {
                        code: "PDF_EXPORT_FAILED",
                    }),
                );
            }
        },
    );
}
