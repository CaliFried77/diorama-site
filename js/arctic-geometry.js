//#region KUTUP SAHNESİ GEOMETRİSİ — zemin, platform yüzeyleri, yem iniş hesabı ve tilki geçiş grafiği
/**
 * Shared Arctic habitat geometry.
 * Both fox movement/rendering and cloudberry placement use these exact surfaces.
 * Pure module: dimensions are explicit so the geometry can be unit-tested in Node.
 */
export const ARCTIC_LEDGE_LINKS = Object.freeze({
  0: Object.freeze([1, 2, 4, 5]),
  1: Object.freeze([0, 2, 3]),
  2: Object.freeze([0, 1, 3]),
  3: Object.freeze([1, 2]),
  4: Object.freeze([0, 5, 6]),
  5: Object.freeze([0, 4, 6]),
  6: Object.freeze([4, 5]),
});

export function getArcticGroundY(x, width, height) {
  const sceneWidth = Math.max(1, Number(width) || 1);
  const sceneHeight = Math.max(1, Number(height) || 1);
  const positionX = Number(x) || 0;
  const nx = positionX / sceneWidth;
  return Math.round(
    sceneHeight - 5
    - Math.pow(Math.abs(nx - 0.5) * 1.9, 1.45) * 18
    - Math.sin(positionX * 0.04) * 1.5,
  );
}

export function getArcticLedges(width, height) {
  const sceneWidth = Math.max(1, Number(width) || 1);
  const sceneHeight = Math.max(1, Number(height) || 1);

  return [
    // 0: Main valley snow floor
    {
      id: 0,
      x1: Math.round(sceneWidth * 0.14),
      x2: Math.round(sceneWidth * 0.86),
      yFn: (x) => getArcticGroundY(x, sceneWidth, sceneHeight),
    },
    // 1: Left lower glacial ledge
    { id: 1, x1: 6, x2: Math.round(sceneWidth * 0.25), yFn: (x) => Math.round(sceneHeight * 0.72 + Math.sin(x * 0.06) * 1.5) },
    // 2: Left mid overlook ledge
    { id: 2, x1: Math.round(sceneWidth * 0.20), x2: Math.round(sceneWidth * 0.36), yFn: (x) => Math.round(sceneHeight * 0.62 + Math.cos(x * 0.06) * 1.5) },
    // 3: Left high pine cliff ledge
    { id: 3, x1: 8, x2: Math.round(sceneWidth * 0.19), yFn: (x) => Math.round(sceneHeight * 0.52 + Math.sin(x * 0.07) * 1.5) },
    // 4: Right lower glacial ledge
    { id: 4, x1: Math.round(sceneWidth * 0.75), x2: sceneWidth - 6, yFn: (x) => Math.round(sceneHeight * 0.72 + Math.cos(x * 0.06) * 1.5) },
    // 5: Right mid overlook ledge (near the Nordic cabin)
    { id: 5, x1: Math.round(sceneWidth * 0.64), x2: Math.round(sceneWidth * 0.80), yFn: (x) => Math.round(sceneHeight * 0.60 + Math.sin(x * 0.06) * 1.5) },
    // 6: Right high ridge ledge
    { id: 6, x1: Math.round(sceneWidth * 0.81), x2: sceneWidth - 8, yFn: (x) => Math.round(sceneHeight * 0.50 + Math.cos(x * 0.07) * 1.5) },
  ];
}

export function getArcticLandingY(x, pointerY, width, height) {
  const valleyGround = getArcticGroundY(x, width, height);
  let landingY = valleyGround;

  for (const ledge of getArcticLedges(width, height)) {
    if (x < ledge.x1 || x > ledge.x2) continue;
    const surfaceY = ledge.yFn(x);
    if (surfaceY >= pointerY - 12 && surfaceY < landingY) landingY = surfaceY;
  }

  return landingY;
}
//#endregion KUTUP SAHNESİ GEOMETRİSİ
