// Shared scene caches. Kept separate to avoid circular imports between UI and scenery.
export const sceneCache = {
    bgCache: null,
    staticEnvCache: null,
    koiFloraCache: null,
    koiWaterOpticsCache: null,
};

export function invalidateBackgroundCache() {
    sceneCache.bgCache = null;
    sceneCache.staticEnvCache = null;
    sceneCache.koiFloraCache = null;
    sceneCache.koiWaterOpticsCache = null;
}
