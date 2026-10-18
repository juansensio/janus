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
            attrs: { id: {} },
            content: "text*",
            parseDOM: [
                {
                    tag: "janus-ai-comment",
                    getAttrs(dom) {
                        return {
                            id: (dom as HTMLElement).getAttribute("id"),
                        };
                    },
                },
            ],
            toDOM(node) {
                return ["janus-ai-comment", { id: node.attrs.id }, 0];
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
