import { describe, expect, it } from "vitest";
import { initTestI18n } from "../test-i18n";
import { openAiModelOptionLabel } from "./open-ai-model-label";

describe("openAiModelOptionLabel", () => {
    it("uses locale labels for known slugs and raw slug otherwise", () => {
        initTestI18n("en");
        expect(openAiModelOptionLabel("auto")).toBe("Auto");
        expect(openAiModelOptionLabel("gpt-4o")).toBe("GPT-4o");
        expect(openAiModelOptionLabel("some-new-openai-slug")).toBe(
            "some-new-openai-slug",
        );
    });
});
