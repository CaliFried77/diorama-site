import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync(new URL('../js/10-glass-renderer.js', import.meta.url), 'utf8');
const scenery = readFileSync(new URL('../js/09-scenery.js', import.meta.url), 'utf8');
const backgrounds = readFileSync(new URL('../js/habitat-backgrounds.js', import.meta.url), 'utf8');
const koi = readFileSync(new URL('../js/creature-koi.js', import.meta.url), 'utf8');
const flora = readFileSync(new URL('../js/habitat-flora-renderer.js', import.meta.url), 'utf8');

test('Kyoto water optics are composited over the koi sprites', () => {
  const fishPass = renderer.indexOf('creatures[i].draw();');
  const waterPass = renderer.indexOf('drawKoiWaterOptics(sceneTime);');

  assert.ok(fishPass >= 0, 'creature draw pass exists');
  assert.ok(waterPass > fishPass, 'water refraction is drawn after the fish');
  assert.match(scenery, /export function drawKoiWaterOptics\(time\)/);
  assert.match(scenery, /waterCtx\.clip\(\)/, 'water effects are clipped to the pond');
  assert.match(scenery, /depthVeil/, 'a depth-tinted water layer is applied');
  assert.match(scenery, /getKoiWaterSurfaceY/, 'optics follow the visible waterline');
});

test('Koi is drawn as a three-quarter sprite with a single near-side eye', () => {
  const drawSection = koi.slice(koi.indexOf('    draw() {'));
  assert.match(koi, /buildKoiSprites\(palette\)/, 'each koi uses a cached pixel sprite');
  assert.match(drawSection, /ctx\.drawImage\(this\.sprites\.body/);
  assert.match(drawSection, /ctx\.drawImage\(this\.sprites\.tail/);
  assert.match(koi, /single near-side eye\/flank/);
  assert.doesNotMatch(drawSection, /pRect\(/, 'the animation loop no longer paints hundreds of body pixels');
  assert.match(drawSection, /ctx\.globalAlpha = 0\.90 - depth \* 0\.08/, 'underwater attenuation follows depth');
  assert.doesNotMatch(koi, /rgba\(2, 10, 18, 0\.30\)/, 'old floating shadow is removed');
});

test('Kyoto environment removes the red bridge and adds a second tea pavilion', () => {
  assert.doesNotMatch(backgrounds, /bridgeStart|bridgeWidth|kemerli kızıl köprü/);
  assert.match(backgrounds, /pavilionX = Math\.round\(pw \* 0\.685\)/);
  assert.match(backgrounds, /Shoji panels/);
  assert.match(backgrounds, /stone path follows the far shore/);
});

test('heavy Kyoto flora and water optics are updated from cached offscreen layers', () => {
  assert.match(scenery, /time - cache\.updatedAt >= 50/, 'Kyoto flora cache refreshes at 20 Hz');
  assert.match(scenery, /ctx\.drawImage\(cache\.canvas, 0, 0\)/, 'cached flora is composited with one image draw');
  assert.match(scenery, /time - cache\.updatedAt >= 50/, 'water optics cache refreshes at 20 Hz');
  assert.match(flora, /targetCtx = null/, 'flora supports offscreen drawing');
  assert.match(renderer, /prefersReducedMotion \? 150 : 100/, 'glass sampling is reduced to 10 Hz');
  assert.match(renderer, /Find the strongest nearby creature first, then render one glow/);
  assert.doesNotMatch(renderer, /lctx\.globalAlpha = 0\.35/, 'duplicate full-card glass sampling is removed');
});
