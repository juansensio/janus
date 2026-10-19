import type { Node as PmNode } from "prosemirror-model";
import { manuscriptSchema } from "./manuscript-schema";

const ROOT_OPEN = '<janus-manuscript version="1">';
const ROOT_CLOSE = "</janus-manuscript>";

function escapeText(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
    return escapeText(value).replaceAll('"', "&quot;");
}

function serializeBlock(node: PmNode): string {
    if (node.type.name === "janus_p") {
        return `<janus-p>${escapeText(node.textContent)}</janus-p>`;
    }
    if (node.type.name === "janus_ai_comment") {
        const id = String(node.attrs.id ?? "");
        const model = String(node.attrs.model ?? "").trim();
        const modelAttr = model ? ` model="${escapeAttr(model)}"` : "";
        const variant = String(node.attrs.variant ?? "").trim();
        const variantAttr = variant ? ` variant="${escapeAttr(variant)}"` : "";
        const source = String(node.attrs.source ?? "").trim();
        const sourceAttr = source ? ` source="${escapeAttr(source)}"` : "";
        return `<janus-ai-comment id="${escapeAttr(id)}"${modelAttr}${variantAttr}${sourceAttr}>${escapeText(node.textContent)}</janus-ai-comment>`;
    }
    if (node.type.name === "janus_ai_draft") {
        const id = String(node.attrs.id ?? "");
        const commentId = String(node.attrs.commentId ?? "");
        const inner = [];
        node.forEach((child) => {
            if (child.type.name === "janus_p") {
                inner.push(`<janus-p>${escapeText(child.textContent)}</janus-p>`);
            }
        });
        return `<janus-ai-draft id="${escapeAttr(id)}" comment-id="${escapeAttr(commentId)}">${inner.join("")}</janus-ai-draft>`;
    }
    return "";
}

export function serializeManuscriptHtml(doc: PmNode): string {
    const body: string[] = [];
    doc.forEach((child) => {
        body.push(serializeBlock(child));
    });
    return `${ROOT_OPEN}${body.join("")}${ROOT_CLOSE}`;
}

export function parseManuscriptHtml(html: string): PmNode {
    const trimmed = html.trim();
    const parser = new window.DOMParser();
    const dom = parser.parseFromString(trimmed || ROOT_OPEN + ROOT_CLOSE, "text/html");
    const root = dom.querySelector("janus-manuscript");
    if (!root) {
        return manuscriptSchema.node("doc", null, [
            manuscriptSchema.node("janus_p"),
        ]);
    }
    const blocks: PmNode[] = [];
    for (const child of root.children) {
        const tag = child.tagName.toLowerCase();
        if (tag === "janus-p") {
            blocks.push(
                manuscriptSchema.node(
                    "janus_p",
                    null,
                    child.textContent
                        ? [manuscriptSchema.text(child.textContent)]
                        : undefined,
                ),
            );
            continue;
        }
        if (tag === "janus-ai-comment") {
            const id = child.getAttribute("id") ?? "";
            const model = child.getAttribute("model") ?? "";
            const variant = child.getAttribute("variant") ?? "";
            const source = child.getAttribute("source") ?? "";
            blocks.push(
                manuscriptSchema.node(
                    "janus_ai_comment",
                    { id, model, variant, source },
                    child.textContent
                        ? [manuscriptSchema.text(child.textContent)]
                        : undefined,
                ),
            );
            continue;
        }
        if (tag === "janus-ai-draft") {
            const id = child.getAttribute("id") ?? "";
            const commentId = child.getAttribute("comment-id") ?? "";
            const paragraphs: PmNode[] = [];
            for (const p of child.querySelectorAll("janus-p")) {
                paragraphs.push(
                    manuscriptSchema.node(
                        "janus_p",
                        null,
                        p.textContent
                            ? [manuscriptSchema.text(p.textContent)]
                            : undefined,
                    ),
                );
            }
            blocks.push(
                manuscriptSchema.node("janus_ai_draft", {
                    id,
                    commentId,
                }, paragraphs),
            );
        }
    }
    if (blocks.length === 0) {
        blocks.push(manuscriptSchema.node("janus_p"));
    }
    return manuscriptSchema.node("doc", null, blocks);
}

export function createEmptyManuscriptHtml(): string {
    return `${ROOT_OPEN}${ROOT_CLOSE}`;
}
