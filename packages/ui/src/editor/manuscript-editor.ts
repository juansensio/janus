import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { EditorState, Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { t } from "../i18n";
import { manuscriptSchema } from "./manuscript-schema";
import { parseManuscriptHtml, serializeManuscriptHtml } from "./manuscript-html";

export type ManuscriptEditorOptions = {
    lang: string;
    showAiChrome: boolean;
    onDocChange: () => void;
    onWriteComment: (commentId: string) => Promise<void>;
    onAcceptDraft: (draftId: string) => Promise<void>;
    onRejectDraft: (draftId: string) => Promise<void>;
    onTransformError: (message: string) => void;
};

export type ManuscriptEditor = {
    getHtml(): string;
    setHtml(html: string): void;
    focus(): void;
    destroy(): void;
    insertAiComment(): string;
};

export function createManuscriptEditor(
    mount: HTMLElement,
    initialHtml: string,
    options: ManuscriptEditorOptions,
): ManuscriptEditor {
    const doc = parseManuscriptHtml(initialHtml);
    const changePlugin = new Plugin({
        view() {
            return {
                update(view, prevState) {
                    if (!view.state.doc.eq(prevState.doc)) {
                        options.onDocChange();
                    }
                },
            };
        },
    });

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
                if (options.showAiChrome) {
                    const actions = document.createElement("div");
                    actions.className = "editor-ai-comment-actions";
                    const write = document.createElement("button");
                    write.type = "button";
                    write.className = "editor-ai-comment-write";
                    write.textContent = t("manuscript.writeAi");
                    write.addEventListener("click", () => {
                        void options.onWriteComment(commentId).catch(() => {
                            options.onTransformError(t("ai.writeFailed"));
                        });
                    });
                    actions.append(write);
                    dom.append(actions, contentDOM);
                } else {
                    dom.append(contentDOM);
                }
                return { dom, contentDOM };
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
            const comment = manuscriptSchema.node(
                "janus_ai_comment",
                { id },
                [manuscriptSchema.text("AI instruction…")],
            );
            const { state } = view;
            const tr = state.tr.insert(state.doc.content.size, comment);
            view.dispatch(tr);
            return id;
        },
    };
}
