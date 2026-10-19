import { Schema } from "prosemirror-model";

export const manuscriptSchema = new Schema({
    nodes: {
        doc: { content: "block+" },
        janus_p: {
            group: "block",
            content: "text*",
            parseDOM: [{ tag: "janus-p" }],
            toDOM() {
                return ["janus-p", 0];
            },
        },
        janus_ai_comment: {
            group: "block",
            attrs: {
                id: {},
                model: { default: "" },
                variant: { default: "" },
                source: { default: "" },
            },
            content: "text*",
            parseDOM: [
                {
                    tag: "janus-ai-comment",
                    getAttrs(dom) {
                        const el = dom as HTMLElement;
                        return {
                            id: el.getAttribute("id"),
                            model: el.getAttribute("model") ?? "",
                            variant: el.getAttribute("variant") ?? "",
                            source: el.getAttribute("source") ?? "",
                        };
                    },
                },
            ],
            toDOM(node) {
                const attrs: Record<string, string> = {
                    id: String(node.attrs.id),
                };
                const model = String(node.attrs.model ?? "").trim();
                if (model) {
                    attrs.model = model;
                }
                const variant = String(node.attrs.variant ?? "").trim();
                if (variant) {
                    attrs.variant = variant;
                }
                const source = String(node.attrs.source ?? "").trim();
                if (source) {
                    attrs.source = source;
                }
                return ["janus-ai-comment", attrs, 0];
            },
        },
        janus_ai_draft: {
            group: "block",
            attrs: { id: {}, commentId: {} },
            content: "janus_p+",
            parseDOM: [
                {
                    tag: "janus-ai-draft",
                    getAttrs(dom) {
                        const el = dom as HTMLElement;
                        return {
                            id: el.getAttribute("id"),
                            commentId: el.getAttribute("comment-id"),
                        };
                    },
                },
            ],
            toDOM(node) {
                return [
                    "janus-ai-draft",
                    {
                        id: node.attrs.id,
                        "comment-id": node.attrs.commentId,
                    },
                    0,
                ];
            },
        },
        text: { group: "inline" },
    },
    marks: {},
});
