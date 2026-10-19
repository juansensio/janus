import type { BookSummary, JanusBridge } from "@janus/bridge";
import { getUiLocale, t } from "../i18n";
import { createAutosaveController, type EditorSaveStatus } from "./autosave";
import { aiWriteErrorMessage } from "./ai-write-error";
import {
    mountProjectNav,
    mountSupportDocCreatePanel,
    type BookProjectDoc,
} from "./editor-project-nav";
import type { AiWriteFlight } from "./manuscript-editor";
import { mountEditorZoomBar } from "./editor-zoom-bar";
import {
    attachEditorZoomShortcuts,
    createEditorZoomController,
    loadInitialEditorZoom,
} from "./editor-zoom";
import {
    createManuscriptEditor,
    type ManuscriptEditor,
} from "./manuscript-editor";

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

    const exportPdfButton = document.createElement("button");
    exportPdfButton.type = "button";
    exportPdfButton.className = "editor-export-pdf";
    exportPdfButton.textContent = t("manuscript.exportPdf");

    const desktopAiCapable = bridge.platform() === "desktop";
    header.append(backButton);

    const status = document.createElement("p");
    status.className = "editor-status";
    status.setAttribute("aria-live", "polite");

    const saveError = document.createElement("p");
    saveError.className = "editor-error";

    const transformError = document.createElement("p");
    transformError.className = "editor-error";

    const loadError = document.createElement("p");
    loadError.className = "editor-error";

    const exportError = document.createElement("p");
    exportError.className = "editor-error";

    chrome.append(status, saveError, transformError, loadError, exportError);
    host.append(chrome);

    let worldbuildingExists = false;
    try {
        const supportList = await bridge.listSupportDocs(book.id);
        const worldbuilding = supportList.find(
            (entry) => entry.kind === "worldbuilding",
        );
        worldbuildingExists = worldbuilding?.exists ?? false;
    } catch {
        worldbuildingExists = false;
    }

    let activeDoc: BookProjectDoc = "manuscript";
    let switching = false;

    const projectNav = mountProjectNav(header, {
        active: activeDoc,
        onSelect: (doc) => {
            void switchDoc(doc);
        },
    });
    if (desktopAiCapable) {
        header.append(
            exportPdfButton,
            addCommentButton,
            rewriteSelectionButton,
        );
    }
    chrome.prepend(header);

    const scrollport = document.createElement("div");
    scrollport.className = "editor-scrollport";

    const page = document.createElement("article");
    page.className = "editor-page";

    const title = document.createElement("h1");
    title.className = "editor-title";
    title.textContent = book.title;

    const field = document.createElement("div");
    field.className = "editor-field";
    field.setAttribute("aria-label", book.title);

    page.append(title, field);
    scrollport.append(page);
    host.append(scrollport);

    const createHost = document.createElement("div");
    createHost.className = "editor-support-create-host";
    createHost.hidden = true;
    scrollport.append(createHost);

    let createPanel: ReturnType<typeof mountSupportDocCreatePanel> | null =
        null;

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

    let editor: ManuscriptEditor | null = null;

    const writeFlight: AiWriteFlight = {
        inFlight: false,
        commentId: null,
        statusMessage: null,
    };

    const openAiModelOptions: string[] = ["auto"];

    const locale = getUiLocale();
    document.documentElement.lang = locale;

    let syncRewriteSelectionButton: () => void = () => {};

    function updateAiChromeVisibility(): void {
        const showAi =
            desktopAiCapable &&
            activeDoc === "manuscript" &&
            page.hidden === false;
        addCommentButton.hidden = !showAi;
        if (!showAi) {
            rewriteSelectionButton.hidden = true;
        } else {
            syncRewriteSelectionButton();
        }
    }

    function showCreateState(): void {
        page.hidden = true;
        createHost.hidden = false;
        createPanel?.dispose();
        createPanel = mountSupportDocCreatePanel(createHost, {
            onCreate: async () => {
                saveError.textContent = "";
                try {
                    await bridge.createSupportDoc(book.id, "worldbuilding");
                    worldbuildingExists = true;
                    hideCreateState();
                    await mountEditorForDoc("worldbuilding");
                } catch {
                    saveError.textContent = t("supportDocs.createFailed");
                }
            },
        });
        updateAiChromeVisibility();
    }

    function hideCreateState(): void {
        createPanel?.dispose();
        createPanel = null;
        createHost.hidden = true;
        createHost.replaceChildren();
        page.hidden = false;
        updateAiChromeVisibility();
    }

    async function teardownEditor(): Promise<void> {
        editor?.destroy();
        editor = null;
        autosaveRef.current?.dispose();
        autosaveRef.current = null;
        field.replaceChildren();
        syncRewriteSelectionButton = () => {};
    }

    async function loadHtmlForDoc(doc: BookProjectDoc): Promise<string> {
        if (doc === "manuscript") {
            return bridge.readManuscript(book.id);
        }
        return bridge.readSupportDoc(book.id, "worldbuilding");
    }

    async function mountEditorForDoc(doc: BookProjectDoc): Promise<boolean> {
        hideCreateState();
        loadError.textContent = "";
        let loadedHtml = "";
        try {
            loadedHtml = await loadHtmlForDoc(doc);
        } catch {
            loadError.textContent =
                doc === "manuscript"
                    ? t("manuscript.loadFailed")
                    : t("supportDocs.loadFailed");
            return false;
        }

        const showAiChrome = desktopAiCapable && doc === "manuscript";
        const manuscriptEditor = createManuscriptEditor(field, loadedHtml, {
            lang: locale,
            showAiChrome,
            openAiModelOptions,
            getWriteFlight: () => writeFlight,
            onDocChange: () => {
                autosaveRef.current?.onInput(manuscriptEditor.getHtml());
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
                manuscriptEditor.refreshAiCommentChrome();
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
                                manuscriptEditor.applyStreamingDraft(
                                    commentId,
                                    streamingDraftId,
                                    draftHtml,
                                );
                            },
                        },
                    );
                    manuscriptEditor.setHtml(html);
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
                    manuscriptEditor.refreshAiCommentChrome();
                }
                if (writeError) {
                    throw writeError;
                }
            },
            onAcceptDraft: async (draftId) => {
                transformError.textContent = "";
                try {
                    const html = await bridge.acceptAiDraft(book.id, draftId);
                    manuscriptEditor.setHtml(html);
                    autosaveRef.current?.markLoaded(html);
                } catch {
                    transformError.textContent = t("manuscript.transformFailed");
                }
            },
            onRejectDraft: async (draftId) => {
                transformError.textContent = "";
                try {
                    const html = await bridge.rejectAiDraft(book.id, draftId);
                    manuscriptEditor.setHtml(html);
                    autosaveRef.current?.markLoaded(html);
                } catch {
                    transformError.textContent = t("manuscript.transformFailed");
                }
            },
            onTransformError: (message) => {
                transformError.textContent = message;
            },
        });
        editor = manuscriptEditor;

        if (showAiChrome) {
            syncRewriteSelectionButton = (): void => {
                const spans = manuscriptEditor.getHighlightRewriteSpans();
                rewriteSelectionButton.hidden = spans === null;
                rewriteSelectionButton.disabled = writeFlight.inFlight;
            };
            void (async () => {
                try {
                    const modelSettings = await bridge.getOpenAiModelSettings();
                    if (host.isConnected && editor === manuscriptEditor) {
                        manuscriptEditor.setOpenAiModelOptions(
                            modelSettings.options,
                        );
                    }
                } catch {
                    // keep default options
                }
            })();
        } else {
            syncRewriteSelectionButton = () => {};
            rewriteSelectionButton.hidden = true;
        }

        const save =
            doc === "manuscript"
                ? (text: string) => bridge.writeManuscript(book.id, text)
                : (text: string) =>
                      bridge.writeSupportDoc(book.id, "worldbuilding", text);

        const autosave = createAutosaveController({
            intervalMs: AUTOSAVE_INTERVAL_MS,
            getText: () => manuscriptEditor.getHtml(),
            save,
            onStatus: (saveStatus) => {
                setStatus(status, saveStatus, saveError);
            },
        });
        autosaveRef.current = autosave;
        autosave.markLoaded(loadedHtml);
        manuscriptEditor.focus();
        updateAiChromeVisibility();
        syncRewriteSelectionButton();
        return true;
    }

    async function switchDoc(next: BookProjectDoc): Promise<void> {
        if (switching || next === activeDoc) {
            return;
        }
        switching = true;
        saveError.textContent = "";
        if (autosaveRef.current?.isDirty()) {
            try {
                await autosaveRef.current.flush();
            } catch {
                saveError.textContent = t("manuscript.saveFailed");
                switching = false;
                return;
            }
        }
        await teardownEditor();

        activeDoc = next;
        projectNav.setActive(activeDoc);

        if (activeDoc === "worldbuilding" && !worldbuildingExists) {
            showCreateState();
            switching = false;
            return;
        }

        const ok = await mountEditorForDoc(activeDoc);
        if (!ok && activeDoc === "worldbuilding") {
            activeDoc = "manuscript";
            projectNav.setActive(activeDoc);
            await mountEditorForDoc("manuscript");
        }
        switching = false;
    }

    const initialOk = await mountEditorForDoc("manuscript");
    if (!initialOk) {
        backButton.addEventListener("click", () => {
            options.onBack();
        });
        disposeEditorZoom();
        projectNav.dispose();
        return;
    }

    addCommentButton.addEventListener("click", () => {
        if (writeFlight.inFlight || !editor) {
            return;
        }
        editor.insertAiComment();
        autosaveRef.current?.onInput(editor.getHtml());
    });

    rewriteSelectionButton.addEventListener("click", () => {
        void (async () => {
            if (writeFlight.inFlight || !editor) {
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
                if (autosaveRef.current?.isDirty()) {
                    await autosaveRef.current.flush();
                }
                const html = await bridge.beginHighlightRewrite(book.id, {
                    commentId,
                    instruction: t("ai.rewriteDefaultInstruction"),
                    spans,
                });
                editor.setHtml(html);
                autosaveRef.current?.markLoaded(html);
                syncRewriteSelectionButton();
            } catch {
                transformError.textContent = t("ai.rewriteSelectionFailed");
            }
        })();
    });

    exportPdfButton.addEventListener("click", () => {
        void (async () => {
            exportError.textContent = "";
            exportPdfButton.disabled = true;
            try {
                if (autosaveRef.current?.isDirty()) {
                    await autosaveRef.current.flush();
                }
                const result = await bridge.exportManuscriptPdf(book.id);
                if (result.outcome === "cancelled") {
                    return;
                }
            } catch {
                exportError.textContent = t("manuscript.exportPdfFailed");
            } finally {
                exportPdfButton.disabled = false;
            }
        })();
    });

    backButton.addEventListener("click", () => {
        void (async () => {
            if (!autosaveRef.current?.isDirty()) {
                disposeEditorZoom();
                await teardownEditor();
                createPanel?.dispose();
                projectNav.dispose();
                options.onBack();
                return;
            }
            try {
                await autosaveRef.current.flush();
                disposeEditorZoom();
                await teardownEditor();
                createPanel?.dispose();
                projectNav.dispose();
                options.onBack();
            } catch {
                saveError.textContent = t("manuscript.saveFailed");
            }
        })();
    });
}
