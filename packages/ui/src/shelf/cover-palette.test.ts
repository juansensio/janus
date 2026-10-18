import { describe, expect, it } from "vitest";
import {
    COVER_CLASS_NAMES,
    coverClassForBookId,
} from "./cover-palette";

describe("coverClassForBookId", () => {
    it("returns a stable class for the same id", () => {
        const id = "550e8400-e29b-41d4-a716-446655440000";
        expect(coverClassForBookId(id)).toBe(coverClassForBookId(id));
    });

    it("returns one of the defined cover modifier classes", () => {
        const cls = coverClassForBookId("00000000-0000-4000-8000-000000000001");
        expect(COVER_CLASS_NAMES).toContain(cls);
    });

    it("can map different ids to different classes", () => {
        const a = coverClassForBookId("aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa");
        const b = coverClassForBookId("bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb");
        const distinct = new Set([a, b]);
        expect(distinct.size).toBeGreaterThanOrEqual(1);
    });
});
