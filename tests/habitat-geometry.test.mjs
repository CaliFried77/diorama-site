import test from 'node:test';
import assert from 'node:assert/strict';

import { getGroundY } from '../js/habitat-geometry.js';

const SCENE_PROFILES = [
  'meadow',
  'rainforest',
  'wetland',
  'botanical',
  'reef',
  'koi-pond',
  'arctic-tundra',
];

test('every habitat ground profile returns a finite height across the viewport', () => {
  const width = 420;
  const height = 240;

  for (const profile of SCENE_PROFILES) {
    for (const x of [0, width * 0.25, width * 0.5, width * 0.75, width]) {
      const y = getGroundY(x, profile, width, height);
      assert.ok(Number.isFinite(y), `${profile} ground height is finite at x=${x}`);
      assert.ok(y > 0 && y <= height, `${profile} ground remains within the scene`);
    }
  }
});

test('ground geometry uses the supplied scene dimensions instead of hidden global state', () => {
  const small = getGroundY(210, 'meadow', 420, 240);
  const large = getGroundY(420, 'meadow', 840, 480);

  assert.ok(Number.isFinite(small));
  assert.ok(Number.isFinite(large));
  assert.notEqual(small, large);
  assert.equal(getGroundY(100, 'unknown-profile', 420, 240), 240);
});
