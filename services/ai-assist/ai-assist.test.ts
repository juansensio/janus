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
                            delta: "<janus-p>Generated</janus-p>",
                        },
                        { type: "response.completed" },
                    ]),
            };
        });
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

    it("invokes onDraftHtmlDelta while reading the response body", async () => {
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
            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(
                        new TextEncoder().encode(
                            'data: {"type":"response.output_text.delta","delta":"He"}\n\n',
                        ),
                    );
                    controller.enqueue(
                        new TextEncoder().encode(
                            'data: {"type":"response.output_text.delta","delta":"llo"}\n\n',
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
                manuscriptHtml: "<janus-manuscript></janus-manuscript>",
                commentId: "c1",
                commentText: "Go",
                locale: "en",
            },
            {
                onDraftHtmlDelta: (html) => deltas.push(html),
            },
        );
        expect(result.draftHtml).toBe("<janus-p>Hello</janus-p>");
        expect(deltas).toEqual([
            "<janus-p>He</janus-p>",
            "<janus-p>Hello</janus-p>",
        ]);
    });

    it("parses SSE when the body starts with event: (non-stream content-type)", async () => {
        const delta = { type: "response.output_text.delta", delta: "From event" };
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
                manuscriptHtml: "<janus-manuscript></janus-manuscript>",
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
                            delta: "Hi",
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
                manuscriptHtml: "<janus-manuscript></janus-manuscript>",
                commentId: "c1",
                commentText: "Go",
                locale: "en",
            },
        );
        expect(result.draftHtml).toBe("<janus-p>Hi</janus-p>");
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
});
