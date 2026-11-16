export function calculateFrameChance(probability, frameScale, randomValue) {
  const chance = Math.max(0, Math.min(1, Number(probability) || 0));
  const scale = Math.max(0, Number(frameScale) || 0);
  const roll = Math.max(0, Math.min(1, Number(randomValue) || 0));
  return roll < 1 - Math.pow(1 - chance, scale);
}

export function calculateFrameSmoothing(amount, frameScale) {
  const factor = Math.max(0, Math.min(1, Number(amount) || 0));
  const scale = Math.max(0, Number(frameScale) || 0);
  return 1 - Math.pow(1 - factor, scale);
}

const X_POSITION_KEYS = new Set(['x', 'baseX', 'targetX', 'originX', 'startX', 'endX', 'homeX', 'anchorX', 'centerX']);
const Y_POSITION_KEYS = new Set(['y', 'baseY', 'targetY', 'originY', 'startY', 'endY', 'homeY', 'anchorY', 'centerY', 'h']);

/** Scale viewport-relative positions in place without recreating scene entities. */
export function scaleSceneCollections(collections, scaleX, scaleY) {
  const sx = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
  const sy = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1;
  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    for (const entity of collection) {
      if (!entity || typeof entity !== 'object') continue;
      for (const [key, value] of Object.entries(entity)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        if (X_POSITION_KEYS.has(key)) entity[key] = value * sx;
        else if (Y_POSITION_KEYS.has(key)) entity[key] = value * sy;
      }
    }
  }
}


/** Build the shared distant-horizon silhouette profile for habitat initialization and resize. */
export function createBackgroundSilhouettes(width) {
  const sceneWidth = Math.max(0, Math.floor(Number(width) || 0));
  const silhouettes = [];
  for (let x = 0; x < sceneWidth; x += 3) {
    const nx = x / Math.max(1, sceneWidth);
    const valleyMask = 0.55 + Math.pow(Math.abs(nx - 0.5) * 1.8, 1.4) * 0.75;
    const h = Math.round((18 + Math.sin(x * 0.016) * 10 + Math.cos(x * 0.042) * 5) * valleyMask);
    silhouettes.push({ x, h });
  }
  return silhouettes;
}
