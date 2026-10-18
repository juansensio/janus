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
        const fetchImpl = vi.fn(async (url: string) => {
            if (url.endsWith("/v1/models")) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        models: [{ slug: "gpt-test", visibility: "list" }],
                    }),
                };
            }
            return {
                ok: true,
                status: 200,
                headers: new Headers({
                    "content-type": "text/event-stream",
                }),
                text: async () =>
                    `data: ${JSON.stringify({
                        type: "response.output_text.delta",
                        delta: JSON.stringify({
                            kind: "draft",
                            paragraphs: ["Generated prose"],
                        }),
                    })}\n\ndata: ${JSON.stringify({
                        type: "response.completed",
                    })}\n\n`,
            };
        });
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
