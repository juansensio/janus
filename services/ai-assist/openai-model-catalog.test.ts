import { describe, expect, it } from "vitest";
import {
    OPENAI_MODEL_PREFERENCE_AUTO,
    buildOpenAiModelOptions,
    normalizeOpenAiModelPreference,
    resolveProviderModelSlug,
    resolveWriteModelSlug,
} from "./openai-model-catalog";

describe("normalizeOpenAiModelPreference", () => {
    it("defaults empty and invalid values to auto", () => {
        expect(normalizeOpenAiModelPreference(undefined)).toBe(
            OPENAI_MODEL_PREFERENCE_AUTO,
        );
        expect(normalizeOpenAiModelPreference("")).toBe(
            OPENAI_MODEL_PREFERENCE_AUTO,
        );
        expect(normalizeOpenAiModelPreference("   ")).toBe(
            OPENAI_MODEL_PREFERENCE_AUTO,
        );
    });

    it("keeps auto and arbitrary slugs from the catalog", () => {
        expect(normalizeOpenAiModelPreference("auto")).toBe("auto");
        expect(normalizeOpenAiModelPreference("gpt-4o")).toBe("gpt-4o");
        expect(normalizeOpenAiModelPreference("gpt-test")).toBe("gpt-test");
    });
});

describe("buildOpenAiModelOptions", () => {
    it("returns only auto when not connected or catalog is empty", () => {
        expect(buildOpenAiModelOptions(null)).toEqual(["auto"]);
        expect(buildOpenAiModelOptions([])).toEqual(["auto"]);
    });

    it("returns auto plus every listed slug from OpenAI", () => {
        expect(buildOpenAiModelOptions(["gpt-4o", "gpt-test"])).toEqual([
            "auto",
            "gpt-4o",
            "gpt-test",
        ]);
    });
});

describe("resolveWriteModelSlug", () => {
    it("uses settings when the comment has no model", () => {
        expect(resolveWriteModelSlug(undefined, "gpt-4o")).toBe("gpt-4o");
        expect(resolveWriteModelSlug("", "gpt-4.1")).toBe("gpt-4.1");
    });

    it("uses comment model when set", () => {
        expect(resolveWriteModelSlug("o4-mini", "gpt-4o")).toBe("o4-mini");
    });

    it("treats auto as provider default", () => {
        expect(resolveWriteModelSlug("auto", "gpt-4o")).toBeUndefined();
    });
});

describe("resolveProviderModelSlug", () => {
    it("omits model for auto", () => {
        expect(resolveProviderModelSlug("auto")).toBeUndefined();
    });

    it("returns slug for explicit preference", () => {
        expect(resolveProviderModelSlug("gpt-4.1")).toBe("gpt-4.1");
    });
});
