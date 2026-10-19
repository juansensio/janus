import { describe, expect, it } from "vitest";
import { EditorState, TextSelection } from "prosemirror-state";
import { manuscriptSchema } from "./manuscript-schema";
import { parseManuscriptHtml } from "./manuscript-html";
import { selectionToHighlightSpans } from "./highlight-selection";

describe("selectionToHighlightSpans", () => {
    it("returns spans for a partial paragraph selection", () => {
        const doc = parseManuscriptHtml(
            '<janus-manuscript version="1"><janus-p>Hello world</janus-p></janus-manuscript>',
        );
        const state = EditorState.create({ doc });
        const from = 1 + "Hello ".length;
        const to = 1 + "Hello world".length;
        const next = state.apply(
            state.tr.setSelection(TextSelection.create(doc, from, to)),
        );
        const spans = selectionToHighlightSpans(next);
        expect(spans).toEqual([{ blockIndex: 0, start: 6, end: 11 }]);
    });

    it("returns null when selection is empty", () => {
        const doc = parseManuscriptHtml(
            '<janus-manuscript version="1"><janus-p>Hi</janus-p></janus-manuscript>',
        );
        const state = EditorState.create({ doc });
        expect(selectionToHighlightSpans(state)).toBeNull();
    });
});
