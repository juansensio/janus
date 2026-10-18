import type { JanusBridge } from "@janus/bridge";
import { createShelfService } from "@janus/library";
import { createCapacitorShelfFs } from "./library-fs";

declare global {
    interface Window {
        janus?: JanusBridge;
    }
}

const MOBILE_LIBRARY_ROOT = "library";

const shelfService = createShelfService(
    MOBILE_LIBRARY_ROOT,
    createCapacitorShelfFs(),
);

export function installMobileBridge(): void {
    const bridge: JanusBridge = {
        platform: () => "mobile",
        listBooks: () => shelfService.listBooks(),
        createBook: () => shelfService.createBook(),
        deleteBook: (id) => shelfService.deleteBook(id),
    };
    window.janus = bridge;
}
