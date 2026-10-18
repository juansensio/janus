import type { BookSummary, JanusBridge } from "@janus/bridge";
import { createAutosaveController, type EditorSaveStatus } from "./autosave";
import { EDITOR_STRINGS } from "./strings";

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
        statusEl.textContent = EDITOR_STRINGS.saving;
        return;
    }
    if (status === "saved") {
        statusEl.textContent = EDITOR_STRINGS.saved;
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

    const header = document.createElement("header");
    header.className = "editor-header";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "editor-back";
    backButton.textContent = EDITOR_STRINGS.backToShelf;

    const title = document.createElement("h1");
    title.className = "editor-title";
    title.textContent = book.title;

    header.append(backButton, title);
    host.append(header);

    const status = document.createElement("p");
    status.className = "editor-status";
    status.setAttribute("aria-live", "polite");

    const saveError = document.createElement("p");
    saveError.className = "editor-error";

    const loadError = document.createElement("p");
    loadError.className = "editor-error";

    host.append(status, saveError, loadError);

    let loadedText = "";
    try {
        loadedText = await bridge.readManuscript(book.id);
    } catch {
        loadError.textContent = EDITOR_STRINGS.loadFailed;
        backButton.addEventListener("click", () => {
            options.onBack();
        });
        return;
    }

    const field = document.createElement("textarea");
    field.className = "editor-field";
    field.value = loadedText;
    host.append(field);

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
                saveError.textContent = EDITOR_STRINGS.saveFailed;
            }
        })();
    });
}
