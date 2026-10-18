import { describe, expect, it } from "vitest";
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
});
