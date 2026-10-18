import { describe, expect, it, vi } from "vitest";
import { assertManuscriptContextSize, MAX_MANUSCRIPT_HTML_BYTES } from "./context";
import { buildGenerateDraftMessages } from "./prompt";
import { AiAssistError } from "./provider";
import { createOpenAiCodexProvider } from "./openai-codex-provider";

describe("assertManuscriptContextSize", () => {
    it("rejects manuscripts over 512 KiB", () => {
        const huge = "x".repeat(MAX_MANUSCRIPT_HTML_BYTES + 1);
        expect(() => assertManuscriptContextSize(huge)).toThrow(AiAssistError);
        try {
            assertManuscriptContextSize(huge);
        } catch (error) {
            expect(error).toMatchObject({ code: "AI_CONTEXT_TOO_LARGE" });
        }
    });
});

describe("buildGenerateDraftMessages", () => {
    it("includes comment text and manuscript html", () => {
        const messages = buildGenerateDraftMessages({
            manuscriptHtml: "<janus-manuscript></janus-manuscript>",
            commentId: "c1",
            commentText: "Write the opening",
            locale: "en",
        });
        expect(messages.user).toContain("Write the opening");
        expect(messages.user).toContain("c1");
    });
});

describe("createOpenAiCodexProvider", () => {
    it("maps successful responses to draft html", async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                output: [
                    {
                        content: [
                            {
                                type: "output_text",
                                text: "<janus-p>Generated</janus-p>",
                            },
                        ],
                    },
                ],
            }),
        }));
        const provider = createOpenAiCodexProvider(fetchImpl as typeof fetch);
        const result = await provider.generateDraft(
            { provider: "openai-codex", accessToken: "token" },
            {
                manuscriptHtml: "<janus-manuscript></janus-manuscript>",
                commentId: "c1",
                commentText: "Go",
                locale: "en",
            },
        );
        expect(result.draftHtml).toBe("<janus-p>Generated</janus-p>");
    });
});
