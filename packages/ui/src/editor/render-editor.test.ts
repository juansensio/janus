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

    it("loads text into the field", async () => {
        const host = document.createElement("div");
        const bridge = createMockJanusBridge({
            readManuscript: async () => "Hello\n",
        });
        await renderEditor(host, bridge, sampleBook, { onBack: () => {} });
        const field = host.querySelector("textarea");
        expect(field?.value).toBe("Hello\n");
        expect(host.querySelector(".editor-title")?.textContent).toBe("Draft");
    });
});

describe("mountJanusShell editor flow", () => {
    it("opens editor when the book card is activated", async () => {
        const root = document.createElement("main");
        document.body.append(root);
        const bridge = createMockJanusBridge({
            listBooks: async () => [sampleBook],
            readManuscript: async () => "Stored",
        });
        await mountJanusShell(root, bridge);
        await vi.waitFor(() =>
            expect(root.querySelector(".shelf-card-open")).not.toBeNull(),
        );
        root.querySelector<HTMLButtonElement>(".shelf-card-open")?.click();
        await vi.waitFor(() =>
            expect(root.querySelector(".editor-field")?.value).toBe("Stored"),
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
