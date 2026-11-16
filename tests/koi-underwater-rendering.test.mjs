import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const renderer = readFileSync(new URL('../js/10-glass-renderer.js', import.meta.url), 'utf8');
const scenery = readFileSync(new URL('../js/09-scenery.js', import.meta.url), 'utf8');
const backgrounds = readFileSync(new URL('../js/habitat-backgrounds.js', import.meta.url), 'utf8');
const koi = readFileSync(new URL('../js/creature-koi.js', import.meta.url), 'utf8');

test('Kyoto water optics are composited over the koi sprites', () => {
  const fishPass = renderer.indexOf('creatures[i].draw();');
  const waterPass = renderer.indexOf('drawKoiWaterOptics(sceneTime);');

  assert.ok(fishPass >= 0, 'creature draw pass exists');
  assert.ok(waterPass > fishPass, 'water refraction is drawn after the fish');
  assert.match(scenery, /export function drawKoiWaterOptics\(time\)/);
  assert.match(scenery, /ctx\.clip\(\)/, 'water effects are clipped to the pond');
  assert.match(scenery, /depthVeil/, 'a depth-tinted water layer is applied');
  assert.match(scenery, /getKoiWaterSurfaceY/, 'optics follow the visible waterline');
});

test('Koi rendering no longer uses a hard black drop shadow', () => {
  assert.match(koi, /ctx\.globalAlpha = 0\.84/, 'koi sprites receive underwater attenuation');
  assert.doesNotMatch(koi, /rgba\(2, 10, 18, 0\.30\)/, 'old floating shadow is removed');
});

test('Kyoto bridge ends are attached to both calculated shore landings', () => {
  assert.match(backgrounds, /bridgeLeftShore = shoreY\(bridgeStart\)/);
  assert.match(backgrounds, /bridgeRightShore = shoreY\(bridgeEnd\)/);
  assert.match(backgrounds, /drawBridgeLanding\(bridgeStart, bridgeLeftShore\)/);
  assert.match(backgrounds, /drawBridgeLanding\(bridgeEnd, bridgeRightShore\)/);
  assert.match(backgrounds, /bridgeBaseY = Math\.round\(\(bridgeLeftY \+ bridgeRightY\) \* 0\.5\)/);
});
