import { describe, expect, it } from "vitest";
import {
    assertSupported,
    catalogKeys,
    formatMessage,
    message,
    registeredLanguages,
    resolveUiLocale,
} from "./index";

describe("registeredLanguages", () => {
    it("lists English then Español", () => {
        expect(registeredLanguages()).toEqual([
            { code: "en", nativeName: "English" },
            { code: "es", nativeName: "Español" },
        ]);
    });
});

describe("resolveUiLocale", () => {
    it("prefers saved over system", () => {
        expect(resolveUiLocale("es", "en")).toBe("es");
    });

    it("normalizes regional system tags", () => {
        expect(resolveUiLocale(null, "es-MX")).toBe("es");
        expect(resolveUiLocale("nope", "en_GB")).toBe("en");
    });

    it("falls back to English for unsupported system locale", () => {
        expect(resolveUiLocale(null, "fr")).toBe("en");
    });
});

describe("assertSupported", () => {
    it("accepts registered codes", () => {
        expect(assertSupported("en")).toBe("en");
        expect(assertSupported("es")).toBe("es");
    });

    it("rejects unsupported codes", () => {
        expect(() => assertSupported("fr")).toThrowError(
            expect.objectContaining({ code: "UNSUPPORTED_LANGUAGE" }),
        );
        expect(() => assertSupported("en-US")).toThrowError(
            expect.objectContaining({ code: "UNSUPPORTED_LANGUAGE" }),
        );
        expect(() => assertSupported("")).toThrowError(
            expect.objectContaining({ code: "UNSUPPORTED_LANGUAGE" }),
        );
    });
});

describe("message", () => {
    it("returns catalog strings", () => {
        expect(message("es", "language.spanish")).toBe("Español");
    });

    it("substitutes placeholders", () => {
        expect(
            message("en", "library.deleteConfirm", { title: "Draft" }),
        ).toBe('Delete "Draft"? This cannot be undone.');
    });

    it("throws for missing keys", () => {
        expect(() => message("en", "missing")).toThrowError(
            expect.objectContaining({ code: "MISSING_MESSAGE" }),
        );
    });
});

describe("catalogKeys", () => {
    it("matches between en and es", () => {
        expect(catalogKeys("en")).toEqual(catalogKeys("es"));
    });
});

describe("formatMessage", () => {
    it("substitutes title placeholder", () => {
        expect(formatMessage("Open {title}", { title: "Draft" })).toBe(
            "Open Draft",
        );
    });

    it("leaves unknown placeholders", () => {
        expect(formatMessage("Hello {name}", {})).toBe("Hello {name}");
    });
});
