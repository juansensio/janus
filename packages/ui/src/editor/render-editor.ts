import type { BookSummary, JanusBridge } from "@janus/bridge";
import { getUiLocale, t } from "../i18n";
import { createAutosaveController, type EditorSaveStatus } from "./autosave";

const AUTOSAVE_INTERVAL_MS = 1000;

export type RenderEditorOptions = {
    onBack: () => void;
};

function setStatus(
    statusEl: HTMLElement,
    status: EditorSaveStatus,
    saveErrorEl: HTMLElement,
): void {
    saveErrorEl.textContent = "";
    if (status === "saving") {
        statusEl.textContent = t("manuscript.saving");
        return;
    }
    if (status === "saved") {
        statusEl.textContent = t("manuscript.saved");
        return;
    }
    statusEl.textContent = "";
}

export async function renderEditor(
    host: HTMLElement,
    bridge: JanusBridge,
    book: BookSummary,
    options: RenderEditorOptions,
): Promise<void> {
    host.replaceChildren();
    host.className = "janus-editor";

    const chrome = document.createElement("div");
    chrome.className = "editor-chrome";

    const header = document.createElement("header");
    header.className = "editor-header";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "editor-back";
    backButton.textContent = t("manuscript.backToShelf");

    header.append(backButton);
    chrome.append(header);

    const status = document.createElement("p");
    status.className = "editor-status";
    status.setAttribute("aria-live", "polite");

    const saveError = document.createElement("p");
    saveError.className = "editor-error";

    const loadError = document.createElement("p");
    loadError.className = "editor-error";

    chrome.append(status, saveError, loadError);
    host.append(chrome);

    let loadedText = "";
    try {
        loadedText = await bridge.readManuscript(book.id);
    } catch {
        loadError.textContent = t("manuscript.loadFailed");
        backButton.addEventListener("click", () => {
            options.onBack();
        });
        return;
    }

    const page = document.createElement("article");
    page.className = "editor-page";

    const title = document.createElement("h1");
    title.className = "editor-title";
    title.textContent = book.title;

    const field = document.createElement("textarea");
    field.className = "editor-field";
    field.setAttribute("aria-label", book.title);
    field.lang = getUiLocale();
    field.spellcheck = true;
    field.value = loadedText;

    page.append(title, field);
    host.append(page);

    const autosave = createAutosaveController({
        intervalMs: AUTOSAVE_INTERVAL_MS,
        getText: () => field.value,
        save: (text) => bridge.writeManuscript(book.id, text),
        onStatus: (saveStatus) => {
            setStatus(status, saveStatus, saveError);
        },
    });
    autosave.markLoaded(loadedText);

    field.addEventListener("input", () => {
        autosave.onInput(field.value);
    });

    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);

    backButton.addEventListener("click", () => {
        void (async () => {
            if (!autosave.isDirty()) {
                autosave.dispose();
                options.onBack();
                return;
            }
            try {
                await autosave.flush();
                autosave.dispose();
                options.onBack();
            } catch {
                saveError.textContent = t("manuscript.saveFailed");
            }
        })();
    });
}
