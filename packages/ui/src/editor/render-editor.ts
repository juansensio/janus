import type { BookSummary, JanusBridge } from "@janus/bridge";
import { getUiLocale, t } from "../i18n";
import { createAutosaveController, type EditorSaveStatus } from "./autosave";
import type { AiWriteFlight } from "./manuscript-editor";
import { createManuscriptEditor } from "./manuscript-editor";

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

    const addCommentButton = document.createElement("button");
    addCommentButton.type = "button";
    addCommentButton.className = "editor-add-comment";
    addCommentButton.textContent = t("manuscript.addAiComment");

    const showAiChrome = bridge.platform() === "desktop";
    header.append(backButton);
    if (showAiChrome) {
        header.append(addCommentButton);
    }
    chrome.append(header);

    const status = document.createElement("p");
    status.className = "editor-status";
    status.setAttribute("aria-live", "polite");

    const saveError = document.createElement("p");
    saveError.className = "editor-error";

    const transformError = document.createElement("p");
    transformError.className = "editor-error";

    const loadError = document.createElement("p");
    loadError.className = "editor-error";

    chrome.append(status, saveError, transformError, loadError);
    host.append(chrome);

    let loadedHtml = "";
    try {
        loadedHtml = await bridge.readManuscript(book.id);
    } catch {
        loadError.textContent = t("manuscript.loadFailed");
        backButton.addEventListener("click", () => {
            options.onBack();
        });
        return;
    }

    const locale = getUiLocale();
    document.documentElement.lang = locale;

    const page = document.createElement("article");
    page.className = "editor-page";

    const title = document.createElement("h1");
    title.className = "editor-title";
    title.textContent = book.title;

    const field = document.createElement("div");
    field.className = "editor-field";
    field.setAttribute("aria-label", book.title);

    page.append(title, field);
    host.append(page);

    const autosaveRef: {
        current: ReturnType<typeof createAutosaveController> | null;
    } = { current: null };

    const writeFlight: AiWriteFlight = {
        inFlight: false,
        commentId: null,
    };

    const editor = createManuscriptEditor(field, loadedHtml, {
        lang: locale,
        showAiChrome,
        getWriteFlight: () => writeFlight,
        onDocChange: () => {
            autosaveRef.current?.onInput(editor.getHtml());
        },
        onWriteComment: async (commentId) => {
            writeFlight.inFlight = true;
            writeFlight.commentId = commentId;
            addCommentButton.disabled = true;
            editor.refreshAiCommentChrome();
            let writeError: unknown;
            try {
                const html = await bridge.writeForComment(
                    book.id,
                    commentId,
                    locale,
                );
                editor.setHtml(html);
                autosaveRef.current?.markLoaded(html);
            } catch (error) {
                writeError = error;
            } finally {
                writeFlight.inFlight = false;
                writeFlight.commentId = null;
                addCommentButton.disabled = false;
                editor.refreshAiCommentChrome();
            }
            if (writeError) {
                editor.showWriteErrorForComment(commentId, writeError);
            }
        },
        onAcceptDraft: async (draftId) => {
            transformError.textContent = "";
            try {
                const html = await bridge.acceptAiDraft(book.id, draftId);
                editor.setHtml(html);
                autosaveRef.current?.markLoaded(html);
            } catch {
                transformError.textContent = t("manuscript.transformFailed");
            }
        },
        onRejectDraft: async (draftId) => {
            transformError.textContent = "";
            try {
                const html = await bridge.rejectAiDraft(book.id, draftId);
                editor.setHtml(html);
                autosaveRef.current?.markLoaded(html);
            } catch {
                transformError.textContent = t("manuscript.transformFailed");
            }
        },
        onTransformError: (message) => {
            transformError.textContent = message;
        },
    });

    const autosave = createAutosaveController({
        intervalMs: AUTOSAVE_INTERVAL_MS,
        getText: () => editor.getHtml(),
        save: (text) => bridge.writeManuscript(book.id, text),
        onStatus: (saveStatus) => {
            setStatus(status, saveStatus, saveError);
        },
    });
    autosaveRef.current = autosave;
    autosave.markLoaded(loadedHtml);

    addCommentButton.addEventListener("click", () => {
        if (writeFlight.inFlight) {
            return;
        }
        editor.insertAiComment();
        autosave.onInput(editor.getHtml());
    });

    editor.focus();

    backButton.addEventListener("click", () => {
        void (async () => {
            if (!autosave.isDirty()) {
                editor.destroy();
                autosave.dispose();
                options.onBack();
                return;
            }
            try {
                await autosave.flush();
                editor.destroy();
                autosave.dispose();
                options.onBack();
            } catch {
                saveError.textContent = t("manuscript.saveFailed");
            }
        })();
    });
}
