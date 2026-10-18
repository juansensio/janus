import { describe, expect, it } from "vitest";
import {
    OPENAI_MODEL_PREFERENCE_AUTO,
    buildOpenAiModelOptions,
    isAllowedOpenAiModelPreference,
    normalizeOpenAiModelPreference,
    resolveProviderModelSlug,
    resolveWriteModelSlug,
} from "./openai-model-catalog";

describe("normalizeOpenAiModelPreference", () => {
    it("defaults unknown values to auto", () => {
        expect(normalizeOpenAiModelPreference(undefined)).toBe(
            OPENAI_MODEL_PREFERENCE_AUTO,
        );
        expect(normalizeOpenAiModelPreference("gpt-unknown")).toBe(
            OPENAI_MODEL_PREFERENCE_AUTO,
        );
    });

    it("keeps allowlisted slugs", () => {
        expect(normalizeOpenAiModelPreference("gpt-4o")).toBe("gpt-4o");
    });
});

describe("buildOpenAiModelOptions", () => {
    it("returns auto and allowlist when not connected", () => {
        expect(buildOpenAiModelOptions(null)).toEqual([
            "auto",
            "gpt-4o",
            "gpt-4.1",
            "o4-mini",
        ]);
    });

    it("hides allowlist entries missing from the account catalog", () => {
        expect(buildOpenAiModelOptions(["gpt-4o", "gpt-test"])).toEqual([
            "auto",
            "gpt-4o",
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

describe("isAllowedOpenAiModelPreference", () => {
    it("accepts auto and allowlist only", () => {
        expect(isAllowedOpenAiModelPreference("auto")).toBe(true);
        expect(isAllowedOpenAiModelPreference("gpt-4o")).toBe(true);
        expect(isAllowedOpenAiModelPreference("gpt-test")).toBe(false);
    });
});
