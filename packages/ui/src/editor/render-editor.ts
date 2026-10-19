import type { BookSummary, JanusBridge } from "@janus/bridge";
import { getUiLocale, t } from "../i18n";
import { createAutosaveController, type EditorSaveStatus } from "./autosave";
import { aiWriteErrorMessage } from "./ai-write-error";
import type { AiWriteFlight } from "./manuscript-editor";
import { mountEditorZoomBar } from "./editor-zoom-bar";
import {
    attachEditorZoomShortcuts,
    createEditorZoomController,
    loadInitialEditorZoom,
} from "./editor-zoom";
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

    const rewriteSelectionButton = document.createElement("button");
    rewriteSelectionButton.type = "button";
    rewriteSelectionButton.className = "editor-rewrite-selection";
    rewriteSelectionButton.textContent = t("ai.rewriteSelection");
    rewriteSelectionButton.hidden = true;

    const showAiChrome = bridge.platform() === "desktop";
    header.append(backButton);
    if (showAiChrome) {
        header.append(addCommentButton, rewriteSelectionButton);
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

    const scrollport = document.createElement("div");
    scrollport.className = "editor-scrollport";
    scrollport.append(page);
    host.append(scrollport);

    const initialZoomPercent = await loadInitialEditorZoom(host, bridge);
    let syncZoomBar: (percent: number) => void = () => {};
    const zoomController = createEditorZoomController(
        host,
        bridge,
        initialZoomPercent,
        {
            onPersistError: () => {
                saveError.textContent = t("manuscript.zoomSaveFailed");
            },
            onPercentChange: (percent) => {
                syncZoomBar(percent);
            },
        },
    );
    const zoomBar = mountEditorZoomBar(host, zoomController);
    syncZoomBar = zoomBar.sync;
    const detachEditorZoomShortcuts = attachEditorZoomShortcuts({
        controller: zoomController,
        isActive: () => host.isConnected,
    });
    const detachEditorZoomMenu = bridge.subscribeEditorZoomMenuAction(
        (action) => {
            if (!host.isConnected) {
                return;
            }
            zoomController.applyDirection(action);
        },
    );

    const disposeEditorZoom = (): void => {
        detachEditorZoomShortcuts();
        detachEditorZoomMenu();
        zoomBar.dispose();
    };

    const autosaveRef: {
        current: ReturnType<typeof createAutosaveController> | null;
    } = { current: null };

    const writeFlight: AiWriteFlight = {
        inFlight: false,
        commentId: null,
        statusMessage: null,
    };

    let syncRewriteSelectionButton: () => void = () => {};

    const editor = createManuscriptEditor(field, loadedHtml, {
        lang: locale,
        showAiChrome,
        openAiModelOptions: ["auto"],
        getWriteFlight: () => writeFlight,
        onDocChange: () => {
            autosaveRef.current?.onInput(editor.getHtml());
            syncRewriteSelectionButton();
        },
        onSelectionChange: () => {
            syncRewriteSelectionButton();
        },
        onWriteComment: async (commentId) => {
            writeFlight.statusMessage = null;
            writeFlight.inFlight = true;
            writeFlight.commentId = commentId;
            addCommentButton.disabled = true;
            rewriteSelectionButton.disabled = true;
            editor.refreshAiCommentChrome();
            const streamingDraftId = crypto.randomUUID();
            let writeError: unknown;
            try {
                if (autosaveRef.current?.isDirty()) {
                    await autosaveRef.current.flush();
                }
                const html = await bridge.writeForComment(
                    book.id,
                    commentId,
                    locale,
                    {
                        onDraftDelta: (draftHtml) => {
                            editor.applyStreamingDraft(
                                commentId,
                                streamingDraftId,
                                draftHtml,
                            );
                        },
                    },
                );
                editor.setHtml(html);
                autosaveRef.current?.markLoaded(html);
                writeFlight.statusMessage = null;
            } catch (error) {
                writeError = error;
                writeFlight.statusMessage = {
                    commentId,
                    text: aiWriteErrorMessage(error, t),
                };
            } finally {
                writeFlight.inFlight = false;
                writeFlight.commentId = null;
                addCommentButton.disabled = false;
                rewriteSelectionButton.disabled = false;
                syncRewriteSelectionButton();
                editor.refreshAiCommentChrome();
            }
            if (writeError) {
                throw writeError;
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

    syncRewriteSelectionButton = (): void => {
        if (!showAiChrome) {
            return;
        }
        const spans = editor.getHighlightRewriteSpans();
        rewriteSelectionButton.hidden = spans === null;
        rewriteSelectionButton.disabled = writeFlight.inFlight;
    };

    if (showAiChrome) {
        void (async () => {
            try {
                const modelSettings = await bridge.getOpenAiModelSettings();
                if (host.isConnected) {
                    editor.setOpenAiModelOptions(modelSettings.options);
                }
            } catch {
                // keep default auto-only options
            }
        })();
    }

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

    rewriteSelectionButton.addEventListener("click", () => {
        void (async () => {
            if (writeFlight.inFlight) {
                return;
            }
            transformError.textContent = "";
            const spans = editor.getHighlightRewriteSpans();
            if (!spans) {
                transformError.textContent = t("ai.rewriteSelectionInvalid");
                return;
            }
            const commentId = crypto.randomUUID();
            try {
                if (autosave.isDirty()) {
                    await autosave.flush();
                }
                const html = await bridge.beginHighlightRewrite(book.id, {
                    commentId,
                    instruction: t("ai.rewriteDefaultInstruction"),
                    spans,
                });
                editor.setHtml(html);
                autosave.markLoaded(html);
                syncRewriteSelectionButton();
            } catch {
                transformError.textContent = t("ai.rewriteSelectionFailed");
            }
        })();
    });

    editor.focus();
    syncRewriteSelectionButton();

    backButton.addEventListener("click", () => {
        void (async () => {
            if (!autosave.isDirty()) {
                disposeEditorZoom();
                editor.destroy();
                autosave.dispose();
                options.onBack();
                return;
            }
            try {
                await autosave.flush();
                disposeEditorZoom();
                editor.destroy();
                autosave.dispose();
                options.onBack();
            } catch {
                saveError.textContent = t("manuscript.saveFailed");
            }
        })();
    });
}
