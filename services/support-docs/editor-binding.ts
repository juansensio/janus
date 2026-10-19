import {
    migrateLegacyMarkdownToHtml,
    parseManuscriptBlocks,
    type ManuscriptBlock,
} from "@janus/manuscript";

export function plainTextToEditorHtml(plain: string): string {
    return migrateLegacyMarkdownToHtml(plain.replace(/\r\n/g, "\n"));
}

export function editorHtmlToPlainText(editorHtml: string): string {
    const blocks = parseManuscriptBlocks(editorHtml);
    const paragraphs: string[] = [];
    for (const block of blocks) {
        if (block.kind !== "p") {
            continue;
        }
        paragraphs.push(block.text);
    }
    return paragraphs.join("\n\n");
}

export function isEditorHtmlSupportDocSafe(editorHtml: string): boolean {
    const blocks = parseManuscriptBlocks(editorHtml);
    return blocks.every((block: ManuscriptBlock) => block.kind === "p");
}
