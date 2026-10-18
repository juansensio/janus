import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createOpenAiCodexProvider } from "@janus/ai-assist";
import {
    insertOrReplaceDraft,
    parseManuscriptBlocks,
} from "@janus/manuscript";

describe("writeForComment manuscript integration", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("inserts draft html after provider generation", async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                output: [
                    {
                        content: [
                            {
                                type: "output_text",
                                text: "<janus-p>Generated prose</janus-p>",
                            },
                        ],
                    },
                ],
            }),
        }));
        const provider = createOpenAiCodexProvider(fetchImpl as typeof fetch);
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment></janus-manuscript>';
        const { draftHtml } = await provider.generateDraft(
            { provider: "openai-codex", accessToken: "token" },
            {
                manuscriptHtml: html,
                commentId: "c1",
                commentText: "Go",
                locale: "en",
            },
        );
        const next = insertOrReplaceDraft(html, "c1", draftHtml, "draft-1");
        const blocks = parseManuscriptBlocks(next);
        expect(blocks.some((b) => b.kind === "draft")).toBe(true);
    });
});
