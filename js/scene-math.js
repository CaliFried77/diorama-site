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
