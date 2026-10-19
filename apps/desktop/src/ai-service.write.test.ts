import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchFn } from "@janus/ai-assist";
import { createLibraryService, type LibraryFs } from "./library-service";
import * as aiSessionStore from "./ai-session-store";
import { createAiBridgeService } from "./ai-service";

function nodeFs(): LibraryFs {
    return {
        mkdir: (p, options) => fs.mkdir(p, options),
        readdir: (p, options) =>
            fs.readdir(p, options as { withFileTypes?: boolean }),
        readFile: (p, encoding) => fs.readFile(p, encoding),
        writeFile: (p, data, encoding) => fs.writeFile(p, data, encoding),
        rm: (p, options) => fs.rm(p, options),
        stat: (p) => fs.stat(p),
        realpath: (p) => fs.realpath(p),
        rename: (from, to) => fs.rename(from, to),
    };
}

const manuscriptHtml =
    '<janus-manuscript version="1"><janus-ai-comment id="c1">hola</janus-ai-comment></janus-manuscript>';

describe("createAiBridgeService writeForComment", () => {
    let root = "";
    let bookId = "";

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), "janus-ai-write-"));
        const library = createLibraryService(
            root,
            nodeFs(),
            () => "550e8400-e29b-41d4-a716-446655440000",
        );
        const book = await library.createBook("Draft");
        bookId = book.id;
        const manuscriptPath = path.join(
            root,
            "books",
            "Draft",
            "manuscript.html",
        );
        await fs.writeFile(manuscriptPath, manuscriptHtml, "utf8");

        vi.spyOn(aiSessionStore, "loadAiSession").mockResolvedValue({
            provider: "openai-codex",
            version: "dev-override",
            accessToken: "token",
            connectedAt: new Date().toISOString(),
        });
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        if (root) {
            await fs.rm(root, { recursive: true });
        }
    });

    it("rejects AI_COMMENT_NOT_INSTRUCTION without writing the manuscript", async () => {
        const fetchImpl: FetchFn = async (url) => {
            if (url.endsWith("/v1/models")) {
                return new Response(
                    JSON.stringify({
                        models: [{ slug: "gpt-test", visibility: "list" }],
                    }),
                    { status: 200 },
                );
            }
            if (url.endsWith("/v1/responses")) {
                return new Response(
                    `data: ${JSON.stringify({
                        type: "response.output_text.delta",
                        delta: JSON.stringify({
                            kind: "refusal",
                            message: "Not an instruction.",
                        }),
                    })}\n\n`,
                    {
                        status: 200,
                        headers: { "content-type": "text/event-stream" },
                    },
                );
            }
            throw new Error(`unexpected fetch: ${url}`);
        };
        const ai = createAiBridgeService(root, nodeFs(), { fetchImpl });
        await expect(ai.writeForComment(bookId, "c1", "en")).rejects.toMatchObject(
            {
                code: "AI_COMMENT_NOT_INSTRUCTION",
                message: "Not an instruction.",
            },
        );
        const onDisk = await fs.readFile(
            path.join(root, "books", "Draft", "manuscript.html"),
            "utf8",
        );
        expect(onDisk).toBe(manuscriptHtml);
    });

    it("does not refetch models on write when the catalog is warm", async () => {
        let modelsCalls = 0;
        const fetchImpl: FetchFn = async (url) => {
            if (url.endsWith("/v1/models")) {
                modelsCalls += 1;
                return new Response(
                    JSON.stringify({
                        models: [{ slug: "gpt-test", visibility: "list" }],
                    }),
                    { status: 200 },
                );
            }
            if (url.endsWith("/v1/responses")) {
                return new Response(
                    `data: ${JSON.stringify({
                        type: "response.output_text.delta",
                        delta: JSON.stringify({
                            kind: "draft",
                            paragraphs: ["Generated prose"],
                        }),
                    })}\n\n`,
                    {
                        status: 200,
                        headers: { "content-type": "text/event-stream" },
                    },
                );
            }
            throw new Error(`unexpected fetch: ${url}`);
        };
        const settingsFs = {
            readFile: async () => JSON.stringify({ openAiModel: "auto" }),
            writeFile: async () => {},
            mkdir: async () => {},
        };
        const ai = createAiBridgeService(root, nodeFs(), {
            fetchImpl,
            userDataPath: "/user",
            settingsFs,
        });
        await ai.getOpenAiModelSettings();
        expect(modelsCalls).toBe(1);
        await ai.writeForComment(bookId, "c1", "en");
        expect(modelsCalls).toBe(1);
    });

    it("persists a draft when the provider returns draft JSON", async () => {
        const fetchImpl: FetchFn = async (url) => {
            if (url.endsWith("/v1/models")) {
                return new Response(
                    JSON.stringify({
                        models: [{ slug: "gpt-test", visibility: "list" }],
                    }),
                    { status: 200 },
                );
            }
            if (url.endsWith("/v1/responses")) {
                return new Response(
                    `data: ${JSON.stringify({
                        type: "response.output_text.delta",
                        delta: JSON.stringify({
                            kind: "draft",
                            paragraphs: ["Generated prose"],
                        }),
                    })}\n\n`,
                    {
                        status: 200,
                        headers: { "content-type": "text/event-stream" },
                    },
                );
            }
            throw new Error(`unexpected fetch: ${url}`);
        };
        const ai = createAiBridgeService(root, nodeFs(), { fetchImpl });
        const next = await ai.writeForComment(bookId, "c1", "en");
        expect(next).toContain("janus-ai-draft");
        const onDisk = await fs.readFile(
            path.join(root, "books", "Draft", "manuscript.html"),
            "utf8",
        );
        expect(onDisk).toContain("janus-ai-draft");
    });
});
