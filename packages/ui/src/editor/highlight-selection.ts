import type { EditorState } from "prosemirror-state";

export type HighlightRewriteSpan = {
    blockIndex: number;
    start: number;
    end: number;
};

export function selectionToHighlightSpans(
    state: EditorState,
): HighlightRewriteSpan[] | null {
    const { from, to, empty } = state.selection;
    if (empty || from >= to) {
        return null;
    }
    const { doc } = state;
    let touchesForbidden = false;
    doc.nodesBetween(from, to, (node) => {
        if (
            node.type.name === "janus_ai_comment" ||
            node.type.name === "janus_ai_draft"
        ) {
            touchesForbidden = true;
        }
    });
    if (touchesForbidden) {
        return null;
    }

    const spans: HighlightRewriteSpan[] = [];
    let paragraphIndex = 0;
    doc.forEach((node, offset) => {
        if (node.type.name !== "janus_p") {
            return;
        }
        const innerStart = offset + 1;
        const innerEnd = offset + node.nodeSize - 1;
        const overlapStart = Math.max(from, innerStart);
        const overlapEnd = Math.min(to, innerEnd);
        if (overlapStart < overlapEnd) {
            spans.push({
                blockIndex: paragraphIndex,
                start: overlapStart - innerStart,
                end: overlapEnd - innerStart,
            });
        }
        paragraphIndex += 1;
    });
    return spans.length > 0 ? spans : null;
}
