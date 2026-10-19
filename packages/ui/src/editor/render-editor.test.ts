import { createMockJanusBridge, type BookSummary } from "@janus/bridge";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountJanusShell } from "../mount";
import { t } from "../i18n";
import { initTestI18n } from "../test-i18n";
import { renderEditor } from "./render-editor";

const sampleBook: BookSummary = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Draft",
    createdAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.useRealTimers();
});

beforeEach(() => {
    initTestI18n("en");
});

describe("renderEditor", () => {
    it("shows load failure and returns to shelf without writing", async () => {
        const host = document.createElement("div");
        document.body.append(host);
        const write = vi.fn(async () => {});
        const bridge = createMockJanusBridge({
            readManuscript: async () => {
                throw Object.assign(new Error("fail"), {
                    code: "MANUSCRIPT_READ_FAILED",
                });
            },
            writeManuscript: write,
        });
        let backed = false;
        await renderEditor(host, bridge, sampleBook, {
            onBack: () => {
                backed = true;
            },
        });
        expect(host.textContent).toContain(t("manuscript.loadFailed"));
        host.querySelector<HTMLButtonElement>(".editor-back")?.click();
        expect(backed).toBe(true);
        expect(write).not.toHaveBeenCalled();
    });

    it("renders manuscript before OpenAI model settings resolve", async () => {
        const host = document.createElement("div");
        document.body.append(host);
        const html =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Prompt</janus-ai-comment></janus-manuscript>';
        let resolveModels:
            | ((value: { preference: string; options: string[] }) => void)
            | undefined;
        const modelsPromise = new Promise<{
            preference: string;
            options: string[];
        }>((resolve) => {
            resolveModels = resolve;
        });
        const bridge = createMockJanusBridge({
            readManuscript: async () => html,
            getOpenAiModelSettings: () => modelsPromise,
        });
        const renderPromise = renderEditor(host, bridge, sampleBook, {
            onBack: () => {},
        });
        await vi.waitFor(() =>
            expect(host.querySelector(".editor-prosemirror")?.textContent).toContain(
                "Prompt",
            ),
        );
        resolveModels?.({
            preference: "auto",
            options: ["auto", "gpt-4o"],
        });
        await renderPromise;
        await vi.waitFor(() => {
            const select = host.querySelector<HTMLSelectElement>(
                ".editor-ai-comment-model",
            );
            expect(
                [...(select?.options ?? [])].map((o) => o.value),
            ).toContain("gpt-4o");
        });
    });

    it("shows inline create for worldbuilding then opens editor", async () => {
        const host = document.createElement("div");
        document.body.append(host);
        const createSupportDoc = vi.fn(async () => ({
            kind: "worldbuilding" as const,
            exists: true,
        }));
        const readSupportDoc = vi.fn(async () =>
            '<janus-manuscript version="1"></janus-manuscript>',
        );
        const bridge = createMockJanusBridge({
            listSupportDocs: async () => [
                { kind: "worldbuilding", exists: false },
            ],
            createSupportDoc,
            readSupportDoc,
            readManuscript: async () =>
                '<janus-manuscript version="1"><janus-p>Ms</janus-p></janus-manuscript>',
        });
        await renderEditor(host, bridge, sampleBook, { onBack: () => {} });
        host.querySelector<HTMLButtonElement>('[data-doc="worldbuilding"]')?.click();
        await vi.waitFor(() =>
            expect(host.querySelector(".editor-support-create-button")).not.toBeNull(),
        );
        await host.querySelector<HTMLButtonElement>(
            ".editor-support-create-button",
        )?.click();
        await vi.waitFor(() => expect(createSupportDoc).toHaveBeenCalled());
        await vi.waitFor(() =>
            expect(host.querySelector(".editor-prosemirror")).not.toBeNull(),
        );
    });

    it("loads html into the prosemirror field", async () => {
        const host = document.createElement("div");
        const html =
            '<janus-manuscript version="1"><janus-p>Hello</janus-p></janus-manuscript>';
        const bridge = createMockJanusBridge({
            readManuscript: async () => html,
        });
        await renderEditor(host, bridge, sampleBook, { onBack: () => {} });
        expect(host.querySelector(".editor-prosemirror")?.textContent).toContain(
            "Hello",
        );
        expect(host.querySelector(".editor-title")?.textContent).toBe("Draft");
        expect(host.querySelector(".editor-scrollport")).not.toBeNull();
        expect(host.querySelector(".editor-scrollport .editor-page")).not.toBeNull();
    });

    it("shows inline error when Write fails", async () => {
        const host = document.createElement("div");
        document.body.append(host);
        const commentHtml =
            '<janus-manuscript version="1"><janus-ai-comment id="c1">Prompt</janus-ai-comment></janus-manuscript>';
        const writeForComment = vi.fn(async () => {
            throw Object.assign(new Error("Connect first"), {
                code: "AI_NOT_CONNECTED",
            });
        });
        const bridge = createMockJanusBridge({
            readManuscript: async () => commentHtml,
            writeForComment,
        });
        await renderEditor(host, bridge, sampleBook, { onBack: () => {} });
        host.querySelector<HTMLButtonElement>(".editor-ai-comment-write")?.click();
        await vi.waitFor(() => expect(writeForComment).toHaveBeenCalled());
        await vi.waitFor(() => {
            expect(
                host.querySelector(".editor-ai-comment-status")?.textContent ?? "",
            ).toContain("Connect OpenAI");
        });
    });
});

describe("mountJanusShell editor flow", () => {
    it("opens editor when the book card is activated", async () => {
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () =>
                '<janus-manuscript version="1"><janus-p>Stored</janus-p></janus-manuscript>',
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-prosemirror")?.textContent).toContain(
                "Stored",
            ),
        );
    });

    it("does not open editor when edit is clicked", async () => {
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () => "Stored",
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-edit")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-edit")?.click();
        await vi.waitFor(() =>
            expect(
                document.querySelector("#shelf-book-name-input"),
            ).not.toBeNull(),
        );
        expect(root.querySelector(".editor-field")).toBeNull();
    });
});
