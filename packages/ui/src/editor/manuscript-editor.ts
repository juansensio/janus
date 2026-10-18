import { deleteAiComment, insertOrReplaceDraft } from "@janus/manuscript";
import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { aiWriteErrorKey } from "./ai-write-error";
import { t } from "../i18n";
import { manuscriptSchema } from "./manuscript-schema";
import { openAiModelOptionLabel } from "../settings/open-ai-model-label";
import { parseManuscriptHtml, serializeManuscriptHtml } from "./manuscript-html";

export type AiWriteFlight = {
    inFlight: boolean;
    commentId: string | null;
};

export type ManuscriptEditorOptions = {
    lang: string;
    showAiChrome: boolean;
    getWriteFlight: () => AiWriteFlight;
    onDocChange: () => void;
    onWriteComment: (commentId: string) => Promise<void>;
    onAcceptDraft: (draftId: string) => Promise<void>;
    onRejectDraft: (draftId: string) => Promise<void>;
    onTransformError: (message: string) => void;
    openAiModelOptions: string[];
};

export type ManuscriptEditor = {
    getHtml(): string;
    setHtml(html: string): void;
    focus(): void;
    destroy(): void;
    insertAiComment(): string;
    refreshAiCommentChrome(): void;
    showWriteErrorForComment(commentId: string, error: unknown): void;
    applyStreamingDraft(
        commentId: string,
        draftId: string,
        draftHtml: string,
    ): void;
};

export function createManuscriptEditor(
    mount: HTMLElement,
    initialHtml: string,
    options: ManuscriptEditorOptions,
): ManuscriptEditor {
    const doc = parseManuscriptHtml(initialHtml);
    const chromeRefreshers = new Set<() => void>();
    let suppressDocChange = false;

    const changePlugin = new Plugin({
        view() {
            return {
                update(view, prevState) {
                    if (
                        !suppressDocChange &&
                        !view.state.doc.eq(prevState.doc)
                    ) {
                        options.onDocChange();
                    }
                },
            };
        },
    });

    function refreshAiCommentChrome(): void {
        for (const apply of chromeRefreshers) {
            apply();
        }
    }

    function updateCommentModel(commentId: string, model: string): void {
        const { state } = view;
        let targetPos: number | null = null;
        state.doc.descendants((node, pos) => {
            if (
                node.type.name === "janus_ai_comment" &&
                String(node.attrs.id) === commentId
            ) {
                targetPos = pos;
                return false;
            }
            return undefined;
        });
        if (targetPos === null) {
            return;
        }
        const node = state.doc.nodeAt(targetPos);
        if (!node) {
            return;
        }
        const tr = state.tr.setNodeMarkup(targetPos, undefined, {
            ...node.attrs,
            model,
        });
        view.dispatch(tr);
        options.onDocChange();
    }

    function removeAiComment(commentId: string): void {
        try {
            const html = deleteAiComment(
                serializeManuscriptHtml(view.state.doc),
                commentId,
            );
            const nextDoc = parseManuscriptHtml(html);
            view.updateState(
                EditorState.create({
                    doc: nextDoc,
                    plugins: view.state.plugins,
                }),
            );
            options.onDocChange();
        } catch {
            options.onTransformError(t("manuscript.deleteCommentFailed"));
        }
    }

    const view = new EditorView(mount, {
        state: EditorState.create({
            doc,
            plugins: [
                history(),
                changePlugin,
                keymap({
                    "Mod-z": undo,
                    "Mod-y": redo,
                    "Mod-Shift-z": redo,
                }),
                keymap(baseKeymap),
            ],
        }),
        nodeViews: {
            janus_ai_comment(node) {
                const dom = document.createElement("div");
                dom.className = "editor-ai-comment";
                const commentId = String(node.attrs.id);
                dom.setAttribute("data-comment-id", commentId);
                const contentDOM = document.createElement("div");
                contentDOM.className = "editor-ai-comment-body";
                let write: HTMLButtonElement | null = null;
                let del: HTMLButtonElement | null = null;
                let modelSelect: HTMLSelectElement | null = null;
                let status: HTMLParagraphElement | null = null;

                function applyChromeState(): void {
                    if (!write || !del || !status) {
                        return;
                    }
                    const flight = options.getWriteFlight();
                    const locked = flight.inFlight;
                    const isActive =
                        locked && flight.commentId === commentId;
                    write.disabled = locked;
                    del.disabled = locked;
                    if (modelSelect) {
                        modelSelect.disabled = locked;
                    }
                    if (isActive) {
                        write.textContent = t("ai.writing");
                        status.textContent = t("ai.writing");
                        status.classList.remove("editor-ai-comment-status-error");
                        dom.setAttribute("aria-busy", "true");
                    } else {
                        write.textContent = t("manuscript.writeAi");
                        dom.removeAttribute("aria-busy");
                    }
                }

                if (options.showAiChrome) {
                    const modelRow = document.createElement("div");
                    modelRow.className = "editor-ai-comment-model-row";
                    const modelLabel = document.createElement("label");
                    modelLabel.className = "editor-ai-comment-model-label";
                    modelLabel.textContent = t("ai.modelLabel");
                    modelSelect = document.createElement("select");
                    modelSelect.className = "editor-ai-comment-model";
                    const defaultOption = document.createElement("option");
                    defaultOption.value = "";
                    defaultOption.textContent = t("ai.modelUseDefault");
                    modelSelect.append(defaultOption);
                    for (const value of options.openAiModelOptions) {
                        const option = document.createElement("option");
                        option.value = value;
                        option.textContent = openAiModelOptionLabel(value);
                        modelSelect.append(option);
                    }
                    modelSelect.value = String(node.attrs.model ?? "");
                    modelSelect.addEventListener("change", () => {
                        updateCommentModel(commentId, modelSelect?.value ?? "");
                    });
                    modelLabel.append(modelSelect);
                    modelRow.append(modelLabel);

                    const actions = document.createElement("div");
                    actions.className = "editor-ai-comment-actions";
                    write = document.createElement("button");
                    write.type = "button";
                    write.className = "editor-ai-comment-write";
                    write.textContent = t("manuscript.writeAi");
                    del = document.createElement("button");
                    del.type = "button";
                    del.className = "editor-ai-comment-delete";
                    del.textContent = t("manuscript.deleteAiComment");
                    status = document.createElement("p");
                    status.className = "editor-ai-comment-status";
                    status.setAttribute("role", "status");
                    status.setAttribute("aria-live", "polite");
                    write.addEventListener("click", () => {
                        void (async () => {
                            status.textContent = "";
                            status.classList.remove(
                                "editor-ai-comment-status-error",
                            );
                            try {
                                await options.onWriteComment(commentId);
                            } catch (error) {
                                if (status) {
                                    status.textContent = t(aiWriteErrorKey(error));
                                    status.classList.add(
                                        "editor-ai-comment-status-error",
                                    );
                                }
                            }
                        })();
                    });
                    del.addEventListener("click", () => {
                        if (options.getWriteFlight().inFlight) {
                            return;
                        }
                        removeAiComment(commentId);
                    });
                    actions.append(write, del);
                    dom.append(modelRow, actions, status, contentDOM);
                    chromeRefreshers.add(applyChromeState);
                    applyChromeState();
                } else {
                    dom.append(contentDOM);
                }
                return {
                    dom,
                    contentDOM,
                    update(updatedNode) {
                        if (updatedNode.type !== node.type) {
                            return false;
                        }
                        if (modelSelect) {
                            const nextModel = String(
                                updatedNode.attrs.model ?? "",
                            );
                            if (modelSelect.value !== nextModel) {
                                modelSelect.value = nextModel;
                            }
                        }
                        return true;
                    },
                    destroy() {
                        chromeRefreshers.delete(applyChromeState);
                    },
                };
            },
            janus_ai_draft(node) {
                const dom = document.createElement("div");
                dom.className = "editor-ai-draft";
                const draftId = String(node.attrs.id);
                dom.setAttribute("data-draft-id", draftId);
                const contentDOM = document.createElement("div");
                contentDOM.className = "editor-ai-draft-body";
                dom.append(contentDOM);
                const actions = document.createElement("div");
                actions.className = "editor-ai-draft-actions";
                const accept = document.createElement("button");
                accept.type = "button";
                accept.className = "editor-ai-draft-accept";
                accept.textContent = t("manuscript.acceptDraft");
                const reject = document.createElement("button");
                reject.type = "button";
                reject.className = "editor-ai-draft-reject";
                reject.textContent = t("manuscript.rejectDraft");
                accept.addEventListener("click", () => {
                    void options.onAcceptDraft(draftId).catch(() => {
                        options.onTransformError(t("manuscript.transformFailed"));
                    });
                });
                reject.addEventListener("click", () => {
                    void options.onRejectDraft(draftId).catch(() => {
                        options.onTransformError(t("manuscript.transformFailed"));
                    });
                });
                actions.append(accept, reject);
                dom.append(actions, contentDOM);
                return {
                    dom,
                    contentDOM,
                    ignoreMutation: () => true,
                };
            },
        },
        attributes: {
            class: "editor-prosemirror",
            lang: options.lang,
            spellcheck: "true",
        },
    });

    return {
        getHtml() {
            return serializeManuscriptHtml(view.state.doc);
        },
        setHtml(html: string) {
            const nextDoc = parseManuscriptHtml(html);
            view.updateState(
                EditorState.create({
                    doc: nextDoc,
                    plugins: view.state.plugins,
                }),
            );
        },
        focus() {
            view.focus();
        },
        destroy() {
            view.destroy();
        },
        insertAiComment() {
            const id = crypto.randomUUID();
            const comment = manuscriptSchema.node("janus_ai_comment", {
                id,
                model: "",
            });
            const { state } = view;
            const tr = state.tr.insert(state.doc.content.size, comment);
            view.dispatch(tr);
            return id;
        },
        refreshAiCommentChrome,
        showWriteErrorForComment(commentId: string, error: unknown): void {
            const comment = view.dom.querySelector(
                `[data-comment-id="${commentId}"]`,
            );
            const statusEl = comment?.querySelector(
                ".editor-ai-comment-status",
            );
            if (!statusEl) {
                return;
            }
            statusEl.textContent = t(aiWriteErrorKey(error));
            statusEl.classList.add("editor-ai-comment-status-error");
        },
        applyStreamingDraft(
            commentId: string,
            draftId: string,
            draftHtml: string,
        ): void {
            suppressDocChange = true;
            try {
                const html = insertOrReplaceDraft(
                    serializeManuscriptHtml(view.state.doc),
                    commentId,
                    draftHtml,
                    draftId,
                );
                const nextDoc = parseManuscriptHtml(html);
                view.updateState(
                    EditorState.create({
                        doc: nextDoc,
                        plugins: view.state.plugins,
                    }),
                );
            } finally {
                suppressDocChange = false;
            }
        },
    };
}
