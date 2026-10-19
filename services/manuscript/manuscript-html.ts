import { parse, type HTMLElement, type Node } from "node-html-parser";
import { ManuscriptServiceError } from "./manuscript-service";

const ROOT_TAG = "janus-manuscript";
const TAG_P = "janus-p";
const TAG_COMMENT = "janus-ai-comment";
const TAG_DRAFT = "janus-ai-draft";

const BLOCK_TAGS = new Set([TAG_P, TAG_COMMENT, TAG_DRAFT]);

export type ManuscriptDocument = {
    version: 1;
    /** Serialized canonical HTML for persistence */
    html: string;
};

export type ManuscriptBlock =
    | { kind: "p"; text: string }
    | {
          kind: "comment";
          id: string;
          text: string;
          model?: string;
          variant?: "rewrite";
          source?: string;
      }
    | {
          kind: "draft";
          id: string;
          commentId: string;
          paragraphs: string[];
      };

function invalid(message: string): never {
    throw new ManuscriptServiceError("MANUSCRIPT_INVALID", message);
}

function escapeText(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
    return escapeText(value).replaceAll('"', "&quot;");
}

function isElement(node: Node): node is HTMLElement {
    return node.nodeType === 1;
}

function elementTagName(el: HTMLElement): string {
    return el.rawTagName ?? el.tagName.toLowerCase();
}

function isIgnorableText(node: Node): boolean {
    return node.nodeType === 3 && node.text.trim() === "";
}

function childElements(el: HTMLElement): HTMLElement[] {
    return el.childNodes.filter(
        (node): node is HTMLElement => isElement(node),
    );
}

function elementTextContent(el: HTMLElement): string {
    let text = "";
    for (const child of el.childNodes) {
        if (child.nodeType === 3) {
            text += child.text;
            continue;
        }
        if (isElement(child)) {
            invalid(`Unexpected element inside ${elementTagName(el)}`);
        }
    }
    return text;
}

function parseParagraph(el: HTMLElement): ManuscriptBlock {
    if (elementTagName(el) !== TAG_P) {
        invalid(`Expected ${TAG_P}`);
    }
    if (childElements(el).length > 0) {
        invalid(`${TAG_P} must contain only text`);
    }
    return { kind: "p", text: elementTextContent(el) };
}

function parseComment(el: HTMLElement): ManuscriptBlock {
    if (elementTagName(el) !== TAG_COMMENT) {
        invalid(`Expected ${TAG_COMMENT}`);
    }
    const id = el.getAttribute("id");
    if (!id?.trim()) {
        invalid(`${TAG_COMMENT} requires id`);
    }
    if (childElements(el).length > 0) {
        invalid(`${TAG_COMMENT} must contain plain text only`);
    }
    const model = el.getAttribute("model")?.trim();
    const variant = el.getAttribute("variant")?.trim();
    const source = el.getAttribute("source")?.trim();
    return {
        kind: "comment",
        id,
        text: elementTextContent(el),
        ...(model ? { model } : {}),
        ...(variant === "rewrite" ? { variant: "rewrite" as const } : {}),
        ...(source ? { source } : {}),
    };
}

function parseDraft(el: HTMLElement): ManuscriptBlock {
    if (elementTagName(el) !== TAG_DRAFT) {
        invalid(`Expected ${TAG_DRAFT}`);
    }
    const id = el.getAttribute("id");
    const commentId = el.getAttribute("comment-id");
    if (!id?.trim() || !commentId?.trim()) {
        invalid(`${TAG_DRAFT} requires id and comment-id`);
    }
    const paragraphs: string[] = [];
    for (const child of el.childNodes) {
        if (isIgnorableText(child)) {
            continue;
        }
        if (!isElement(child)) {
            invalid(`Unexpected text node inside ${TAG_DRAFT}`);
        }
        const tag = elementTagName(child);
        if (tag !== TAG_P) {
            invalid(`Unknown tag inside ${TAG_DRAFT}: ${tag}`);
        }
        const paragraph = parseParagraph(child);
        if (paragraph.kind !== "p") {
            invalid(`Expected ${TAG_P} inside ${TAG_DRAFT}`);
        }
        paragraphs.push(paragraph.text);
    }
    return { kind: "draft", id, commentId, paragraphs };
}

function parseBlock(el: HTMLElement): ManuscriptBlock {
    const tag = elementTagName(el);
    if (!BLOCK_TAGS.has(tag)) {
        invalid(`Unknown tag: ${tag}`);
    }
    if (tag === TAG_P) {
        return parseParagraph(el);
    }
    if (tag === TAG_COMMENT) {
        return parseComment(el);
    }
    return parseDraft(el);
}

function serializeBlock(block: ManuscriptBlock): string {
    if (block.kind === "p") {
        return `<${TAG_P}>${escapeText(block.text)}</${TAG_P}>`;
    }
    if (block.kind === "comment") {
        const modelAttr =
            block.model?.trim()
                ? ` model="${escapeAttr(block.model.trim())}"`
                : "";
        const variantAttr =
            block.variant === "rewrite"
                ? ` variant="${escapeAttr(block.variant)}"`
                : "";
        const sourceAttr =
            block.source?.trim()
                ? ` source="${escapeAttr(block.source.trim())}"`
                : "";
        return `<${TAG_COMMENT} id="${escapeAttr(block.id)}"${modelAttr}${variantAttr}${sourceAttr}>${escapeText(block.text)}</${TAG_COMMENT}>`;
    }
    const inner = block.paragraphs
        .map((text) => `<${TAG_P}>${escapeText(text)}</${TAG_P}>`)
        .join("");
    return `<${TAG_DRAFT} id="${escapeAttr(block.id)}" comment-id="${escapeAttr(block.commentId)}">${inner}</${TAG_DRAFT}>`;
}

function serializeBlocks(blocks: ManuscriptBlock[]): string {
    const body = blocks.map(serializeBlock).join("");
    return `<${ROOT_TAG} version="1">${body}</${ROOT_TAG}>`;
}

function parseRoot(html: string): ManuscriptBlock[] {
    const trimmed = html.trim();
    if (!trimmed) {
        invalid("Manuscript is empty");
    }

    const doc = parse(trimmed, {
        lowerCaseTagName: false,
        comment: false,
    });

    const topLevel = doc.childNodes.filter(
        (node) => !isIgnorableText(node),
    );
    if (topLevel.length !== 1 || !isElement(topLevel[0])) {
        invalid(`Document must have a single ${ROOT_TAG} root`);
    }

    const root = topLevel[0];
    if (elementTagName(root) !== ROOT_TAG) {
        invalid(`Document root must be ${ROOT_TAG}`);
    }
    if (root.getAttribute("version") !== "1") {
        invalid(`${ROOT_TAG} requires version="1"`);
    }

    const blocks: ManuscriptBlock[] = [];
    for (const child of root.childNodes) {
        if (isIgnorableText(child)) {
            continue;
        }
        if (!isElement(child)) {
            invalid("Unexpected non-element child of manuscript root");
        }
        blocks.push(parseBlock(child));
    }
    return blocks;
}

export function createEmptyManuscriptHtml(): string {
    return `<${ROOT_TAG} version="1"></${ROOT_TAG}>`;
}

/** One-time migration from slice 1 plain `manuscript.md` to HTML. */
export function migrateLegacyMarkdownToHtml(markdown: string): string {
    const text = markdown.replace(/\r\n/g, "\n");
    if (text === "") {
        return createEmptyManuscriptHtml();
    }
    const paragraphs = text.split(/\n\n+/);
    const blocks: ManuscriptBlock[] = paragraphs.map((paragraph) => ({
        kind: "p",
        text: paragraph,
    }));
    return serializeBlocks(blocks);
}

export function parseManuscriptBlocks(html: string): ManuscriptBlock[] {
    return parseRoot(html);
}

export function serializeManuscriptBlocks(blocks: ManuscriptBlock[]): string {
    return serializeBlocks(blocks);
}

export function parseManuscriptHtml(html: string): ManuscriptDocument {
    const blocks = parseRoot(html);
    return { version: 1, html: serializeBlocks(blocks) };
}

export function serializeManuscriptDocument(doc: ManuscriptDocument): string {
    if (doc.version !== 1) {
        invalid("Unsupported manuscript version");
    }
    return parseManuscriptHtml(doc.html).html;
}
