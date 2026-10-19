import {
    parseManuscriptBlocks,
    type ManuscriptBlock,
} from "@janus/manuscript";

function escapeHtml(text: string): string {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

export function collectPrintParagraphs(blocks: ManuscriptBlock[]): string[] {
    const paragraphs: string[] = [];
    for (const block of blocks) {
        if (block.kind === "p") {
            paragraphs.push(block.text);
        }
    }
    return paragraphs;
}

export function buildManuscriptPrintHtml(options: {
    title: string;
    manuscriptHtml: string;
}): string {
    const blocks = parseManuscriptBlocks(options.manuscriptHtml);
    const paragraphs = collectPrintParagraphs(blocks);
    const title = escapeHtml(options.title.trim() || "Untitled");
    const body = paragraphs
        .map((text) => `<p>${escapeHtml(text)}</p>`)
        .join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.55;
    color: #111;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 18pt;
    font-weight: 600;
    margin: 0 0 1.5em;
  }
  p {
    margin: 0 0 1em;
    white-space: pre-wrap;
  }
</style>
</head>
<body>
<h1>${title}</h1>
${body}
</body>
</html>`;
}
