/**
 * In-memory OpenAI model catalog for one connected session.
 * Shell owns the instance; invalidate on disconnect / session clear.
 */
export type OpenAiModelCatalogCache = {
    /** `null` = not loaded yet; `[]` = loaded but empty catalog */
    listedSlugs: string[] | null;
};

export function createOpenAiModelCatalogCache(): OpenAiModelCatalogCache {
    return { listedSlugs: null };
}

export function shouldRefreshOpenAiModelCatalog(
    cache: OpenAiModelCatalogCache,
): boolean {
    return cache.listedSlugs === null;
}

export function readListedSlugsFromCache(
    cache: OpenAiModelCatalogCache,
): string[] | null {
    return cache.listedSlugs;
}

export function storeListedSlugsInCache(
    cache: OpenAiModelCatalogCache,
    slugs: string[],
): void {
    cache.listedSlugs = [...slugs];
}

export function invalidateOpenAiModelCatalog(
    cache: OpenAiModelCatalogCache,
): void {
    cache.listedSlugs = null;
}
