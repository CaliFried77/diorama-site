import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

const GEOMETRY_CALLER_FILES = [
  '../js/09-scenery.js',
  '../js/habitat-backgrounds.js',
  '../js/habitat-flora-generator.js',
  '../js/habitat-flora-renderer.js',
];

test('all habitat scene modules pass viewport dimensions to ground geometry', () => {
  for (const file of GEOMETRY_CALLER_FILES) {
    const source = readFileSync(new URL(file, import.meta.url), 'utf8');
    const calls = [...source.matchAll(/\bgetGroundY\(([^)]*)\)/g)];
    assert.ok(calls.length > 0, `${file} contains ground geometry calls`);

    for (const [, args] of calls) {
      assert.match(args, /,\s*pw\s*,\s*ph\s*$/, `${file}: getGroundY(${args})`);
    }
  }
});
