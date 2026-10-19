import { describe, expect, it, vi } from "vitest";
import { assertManuscriptContextSize, MAX_MANUSCRIPT_HTML_BYTES } from "./context";
import { fetchListedInferenceModelSlug } from "./openai-models";
import {
    isResponsesSseBody,
    parseResponsesSse,
} from "./openai-responses-stream";
import { buildGenerateDraftMessages } from "./prompt";
import { AiAssistError } from "./provider";
import { createOpenAiCodexProvider } from "./openai-codex-provider";

function sseBody(events: object[]): string {
    return events.map((event) => `data: ${JSON.stringify(event)}\n`).join("\n");
}

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
    const manuscriptHtml =
        '<janus-manuscript version="1"><janus-p>Opening</janus-p><janus-ai-comment id="c1">Continue</janus-ai-comment></janus-manuscript>';

    it("includes prose context with WRITE mark and the instruction", () => {
        const messages = buildGenerateDraftMessages({
            manuscriptHtml,
            commentId: "c1",
            commentText: "Write the opening",
            locale: "en",
        });
        expect(messages.user).toContain("<<<WRITE>>>");
        expect(messages.user).toContain("Opening");
        expect(messages.user).toContain("Write the opening");
        expect(messages.user).not.toContain("janus-manuscript");
        expect(messages.user).not.toContain("janus-p");
    });

    it("includes original passage when rewriting a highlight", () => {
        const messages = buildGenerateDraftMessages({
            manuscriptHtml,
            commentId: "c1",
            commentText: "Make it shorter",
            locale: "en",
            rewriteSourceText: "Opening",
        });
        expect(messages.user).toContain("Original passage to rewrite:");
        expect(messages.user).toContain("Opening");
    });

    it("asks for draft prose in the manuscript language and refusal in locale", () => {
        const messages = buildGenerateDraftMessages({
            manuscriptHtml,
            commentId: "c1",
            commentText: "Go",
            locale: "es",
        });
        expect(messages.system).toContain("manuscript language");
        expect(messages.system).toContain('locale "es"');
    });
});

describe("isResponsesSseBody", () => {
    it("detects bodies that start with event: lines", () => {
        expect(
            isResponsesSseBody(
                'event: response.created\ndata: {"type":"response.created"}\n',
                "application/json",
            ),
        ).toBe(true);
    });
});

describe("parseResponsesSse", () => {
    it("concatenates output_text deltas", () => {
        const text = parseResponsesSse(
            sseBody([
                { type: "response.output_text.delta", delta: "Hello" },
                { type: "response.output_text.delta", delta: " world" },
                { type: "response.completed" },
            ]),
        );
        expect(text).toBe("Hello world");
    });

    it("notifies onTextDelta while parsing", () => {
        const seen: string[] = [];
        parseResponsesSse(
            sseBody([
                { type: "response.output_text.delta", delta: "Hi" },
                { type: "response.output_text.delta", delta: " there" },
            ]),
            {
                onTextDelta: (text) => seen.push(text),
            },
        );
        expect(seen).toEqual(["Hi", "Hi there"]);
    });

    it("prefers output_text.done over deltas", () => {
        const text = parseResponsesSse(
            sseBody([
                { type: "response.output_text.delta", delta: "partial" },
                {
                    type: "response.output_text.done",
                    text: "<janus-p>Final</janus-p>",
                },
            ]),
        );
        expect(text).toBe("<janus-p>Final</janus-p>");
    });
});

describe("fetchListedInferenceModelSlug", () => {
    it("returns the first list-visible model slug", async () => {
        const fetchImpl = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                models: [
                    { slug: "hidden", visibility: "hidden" },
                    { slug: "gpt-test", visibility: "list" },
                ],
            }),
        }));
        await expect(
            fetchListedInferenceModelSlug("token", fetchImpl as typeof fetch),
        ).resolves.toBe("gpt-test");
    });
});

describe("createOpenAiCodexProvider", () => {
    const manuscriptHtml =
        '<janus-manuscript version="1"><janus-ai-comment id="c1">Go</janus-ai-comment></janus-manuscript>';

    it("maps streamed responses to draft html", async () => {
        const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
            if (url.endsWith("/v1/models")) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        models: [{ slug: "gpt-test", visibility: "list" }],
                    }),
                };
            }
            expect(init?.body).toContain('"stream":true');
            return {
                ok: true,
                status: 200,
                headers: new Headers({
                    "content-type": "text/event-stream",
                }),
                text: async () =>
                    sseBody([
                        {
                            type: "response.output_text.delta",
                            delta: JSON.stringify({
                                kind: "draft",
                                paragraphs: ["Generated"],
                            }),
                        },
                        { type: "response.completed" },
                    ]),
            };
        });
        const provider = createOpenAiCodexProvider(fetchImpl as typeof fetch);
        const result = await provider.generateDraft(
            { provider: "openai-codex", accessToken: "token" },
            {
                manuscriptHtml,
                commentId: "c1",
                commentText: "Go",
                locale: "en",
            },
        );
        expect(result.draftHtml).toBe("<janus-p>Generated</janus-p>");
    });

    it("invokes onDraftHtmlDelta once after the JSON body is complete", async () => {
        const deltas: string[] = [];
        const draftJson = JSON.stringify({
            kind: "draft",
            paragraphs: ["Hello"],
        });
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
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: {"type":"response.output_text.delta","delta":${JSON.stringify(draftJson.slice(0, 3))}}\n\n`,
                        ),
                    );
                    controller.enqueue(
                        new TextEncoder().encode(
                            `data: {"type":"response.output_text.delta","delta":${JSON.stringify(draftJson.slice(3))}}\n\n`,
                        ),
                    );
                    controller.close();
                },
            });
            return {
                ok: true,
                status: 200,
                headers: new Headers({
                    "content-type": "text/event-stream",
                }),
                body: stream,
            };
        });
        const provider = createOpenAiCodexProvider(fetchImpl as typeof fetch);
        const result = await provider.generateDraft(
            { provider: "openai-codex", accessToken: "token" },
            {
                manuscriptHtml,
                commentId: "c1",
                commentText: "Go",
                locale: "en",
            },
            {
                onDraftHtmlDelta: (html) => deltas.push(html),
            },
        );
        expect(result.draftHtml).toBe("<janus-p>Hello</janus-p>");
        expect(deltas).toEqual(["<janus-p>Hello</janus-p>"]);
    });

    it("throws AI_COMMENT_NOT_INSTRUCTION for refusal JSON without delta", async () => {
        const deltas: string[] = [];
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
                    sseBody([
                        {
                            type: "response.output_text.delta",
                            delta: JSON.stringify({
                                kind: "refusal",
                                message: "Not an instruction.",
                            }),
                        },
                    ]),
            };
        });
        const provider = createOpenAiCodexProvider(fetchImpl as typeof fetch);
        await expect(
            provider.generateDraft(
                { provider: "openai-codex", accessToken: "token" },
                {
                    manuscriptHtml,
                    commentId: "c1",
                    commentText: "hola",
                    locale: "en",
                },
                { onDraftHtmlDelta: (html) => deltas.push(html) },
            ),
        ).rejects.toMatchObject({
            code: "AI_COMMENT_NOT_INSTRUCTION",
            message: "Not an instruction.",
        });
        expect(deltas).toEqual([]);
    });

    it("throws AI_PROVIDER_ERROR for non-JSON bodies", async () => {
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
                    sseBody([
                        {
                            type: "response.output_text.delta",
                            delta: "<janus-p>nope</janus-p>",
                        },
                    ]),
            };
        });
        const provider = createOpenAiCodexProvider(fetchImpl as typeof fetch);
        await expect(
            provider.generateDraft(
                { provider: "openai-codex", accessToken: "token" },
                {
                    manuscriptHtml,
                    commentId: "c1",
                    commentText: "Go",
                    locale: "en",
                },
            ),
        ).rejects.toMatchObject({ code: "AI_PROVIDER_ERROR" });
    });

    it("parses SSE when the body starts with event: (non-stream content-type)", async () => {
        const delta = {
            type: "response.output_text.delta",
            delta: JSON.stringify({
                kind: "draft",
                paragraphs: ["From event"],
            }),
        };
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
                    "content-type": "application/json",
                }),
                text: async () =>
                    `event: response.output_text.delta\ndata: ${JSON.stringify(delta)}\n\n`,
            };
        });
        const provider = createOpenAiCodexProvider(fetchImpl as typeof fetch);
        const result = await provider.generateDraft(
            { provider: "openai-codex", accessToken: "token" },
            {
                manuscriptHtml,
                commentId: "c1",
                commentText: "Go",
                locale: "en",
            },
        );
        expect(result.draftHtml).toBe("<janus-p>From event</janus-p>");
    });

    it("skips model list when session includes model", async () => {
        const fetchImpl = vi.fn(async (url: string) => {
            if (url.endsWith("/v1/models")) {
                throw new Error("should not list models");
            }
            return {
                ok: true,
                status: 200,
                headers: new Headers({
                    "content-type": "text/event-stream",
                }),
                text: async () =>
                    sseBody([
                        {
                            type: "response.output_text.delta",
                            delta: JSON.stringify({
                                kind: "draft",
                                paragraphs: ["Hi"],
                            }),
                        },
                        { type: "response.completed" },
                    ]),
            };
        });
        const provider = createOpenAiCodexProvider(fetchImpl as typeof fetch);
        const result = await provider.generateDraft(
            {
                provider: "openai-codex",
                accessToken: "token",
                model: "gpt-fixed",
            },
            {
                manuscriptHtml,
                commentId: "c1",
                commentText: "Go",
                locale: "en",
            },
        );
        expect(result.draftHtml).toBe("<janus-p>Hi</janus-p>");
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
});
