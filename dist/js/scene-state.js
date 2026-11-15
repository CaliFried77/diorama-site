// Shared scene cache. Kept separate so UI, weather and scenery do not import each other cyclically.
export const sceneCache = { bgCache: null };
export function invalidateBackgroundCache() { sceneCache.bgCache = null; }
