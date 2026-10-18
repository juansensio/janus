import { describe, expect, it } from "vitest";
import { createEmptyManuscriptHtml } from "@janus/manuscript";
import {
    createMockJanusBridge,
    createShellLabel,
    type BookSummary,
} from "./index";

describe("createShellLabel", () => {
    it('returns "Janus"', () => {
        expect(createShellLabel()).toBe("Janus");
    });
});

describe("createMockJanusBridge", () => {
    it("implements library methods with async stubs", async () => {
        const bridge = createMockJanusBridge({ platform: () => "mobile" });
        expect(bridge.platform()).toBe("mobile");
        await expect(bridge.listBooks()).resolves.toEqual([]);
        const created = await bridge.createBook("Untitled");
        expect(created.title).toBe("Untitled");
        await expect(bridge.deleteBook("x")).resolves.toBeUndefined();
    });

    it("accepts overrides for listBooks", async () => {
        const books: BookSummary[] = [
            {
                id: "00000000-0000-4000-8000-000000000002",
                title: "Draft",
                createdAt: "2026-01-02T00:00:00.000Z",
            },
        ];
        const bridge = createMockJanusBridge({
            listBooks: async () => books,
        });
        await expect(bridge.listBooks()).resolves.toBe(books);
    });

    it("starts at English and switches to Spanish via setUiLanguage", async () => {
        const bridge = createMockJanusBridge();
        const en = await bridge.getUiLanguage();
        expect(en.locale).toBe("en");
        expect(en.messages["library.shelfLabel"]).toBe("Books");
        const es = await bridge.setUiLanguage("es");
        expect(es.locale).toBe("es");
        expect(es.messages["library.shelfLabel"]).toBe("Libros");
    });

    it("rejects unsupported setUiLanguage codes", async () => {
        const bridge = createMockJanusBridge();
        await expect(bridge.setUiLanguage("fr")).rejects.toMatchObject({
            code: "UNSUPPORTED_LANGUAGE",
        });
    });

    it("stores manuscript text per book id in the mock", async () => {
        const id = "550e8400-e29b-41d4-a716-446655440000";
        const bridge = createMockJanusBridge();
        await expect(bridge.readManuscript(id)).resolves.toBe(
            createEmptyManuscriptHtml(),
        );
        await bridge.writeManuscript(id, "Hello\n");
        await expect(bridge.readManuscript(id)).resolves.toBe("Hello\n");
        await bridge.writeManuscript(id, "Updated");
        await expect(bridge.readManuscript(id)).resolves.toBe("Updated");
    });
});
