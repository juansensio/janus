import type { JanusBridge } from "@janus/bridge";
import { createShelfService } from "@janus/library";
import { createCapacitorShelfFs } from "./library-fs";
import { createCapacitorManuscriptFs } from "./manuscript-fs";
import { createManuscriptBridgeService } from "./manuscript-service";

declare global {
    interface Window {
        janus?: JanusBridge;
    }
}

const MOBILE_LIBRARY_ROOT = "library";

const shelfFs = createCapacitorShelfFs();
const shelfService = createShelfService(MOBILE_LIBRARY_ROOT, shelfFs);
const manuscriptFs = createCapacitorManuscriptFs();
const manuscriptService = createManuscriptBridgeService(
    MOBILE_LIBRARY_ROOT,
    manuscriptFs,
);

export function installMobileBridge(): void {
    const bridge: JanusBridge = {
        platform: () => "mobile",
        listBooks: () => shelfService.listBooks(),
        suggestNewBookTitle: () => shelfService.suggestNewBookTitle(),
        createBook: (title) => shelfService.createBook(title),
        renameBook: (id, title) => shelfService.renameBook(id, title),
        deleteBook: (id) => shelfService.deleteBook(id),
        readManuscript: (id) => manuscriptService.readManuscript(id),
        writeManuscript: (id, text) =>
            manuscriptService.writeManuscript(id, text),
    };
    window.janus = bridge;
}
