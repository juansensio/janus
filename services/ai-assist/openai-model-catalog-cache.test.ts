import { describe, expect, it } from "vitest";
import {
    createOpenAiModelCatalogCache,
    invalidateOpenAiModelCatalog,
    readListedSlugsFromCache,
    shouldRefreshOpenAiModelCatalog,
    storeListedSlugsInCache,
} from "./openai-model-catalog-cache";

describe("openai-model-catalog-cache", () => {
    it("starts empty and needs refresh", () => {
        const cache = createOpenAiModelCatalogCache();
        expect(readListedSlugsFromCache(cache)).toBeNull();
        expect(shouldRefreshOpenAiModelCatalog(cache)).toBe(true);
    });

    it("stores and reads listed slugs", () => {
        const cache = createOpenAiModelCatalogCache();
        storeListedSlugsInCache(cache, ["gpt-4o", "gpt-4.1"]);
        expect(readListedSlugsFromCache(cache)).toEqual(["gpt-4o", "gpt-4.1"]);
        expect(shouldRefreshOpenAiModelCatalog(cache)).toBe(false);
    });

    it("copies slugs on store so callers cannot mutate cache via original array", () => {
        const cache = createOpenAiModelCatalogCache();
        const slugs = ["gpt-4o"];
        storeListedSlugsInCache(cache, slugs);
        slugs.push("gpt-4.1");
        expect(readListedSlugsFromCache(cache)).toEqual(["gpt-4o"]);
    });

    it("invalidate clears cache for next refresh", () => {
        const cache = createOpenAiModelCatalogCache();
        storeListedSlugsInCache(cache, ["gpt-4o"]);
        invalidateOpenAiModelCatalog(cache);
        expect(readListedSlugsFromCache(cache)).toBeNull();
        expect(shouldRefreshOpenAiModelCatalog(cache)).toBe(true);
    });

    it("can store an empty catalog after fetch", () => {
        const cache = createOpenAiModelCatalogCache();
        storeListedSlugsInCache(cache, []);
        expect(readListedSlugsFromCache(cache)).toEqual([]);
        expect(shouldRefreshOpenAiModelCatalog(cache)).toBe(false);
    });
});
