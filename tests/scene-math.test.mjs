import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFrameChance, calculateFrameSmoothing, scaleSceneCollections, createBackgroundSilhouettes } from '../js/scene-math.js';

test('frame chance is deterministic with an injected random value and bounded probability', () => {
  assert.equal(calculateFrameChance(0.5, 1, 0.49), true);
  assert.equal(calculateFrameChance(0.5, 1, 0.5), false);
  assert.equal(calculateFrameChance(2, 1, 0.99), true);
  assert.equal(calculateFrameChance(-1, 1, 0.01), false);
});

test('frame smoothing follows frame scale while preserving the original curve', () => {
  assert.equal(calculateFrameSmoothing(0, 1), 0);
  assert.equal(calculateFrameSmoothing(1, 1), 1);
  assert.equal(calculateFrameSmoothing(0.5, 1), 0.5);
  assert.ok(calculateFrameSmoothing(0.5, 2) > 0.5);
});

test('viewport resize scales scene positions in place without replacing entities', () => {
  const bee = { x: 100, y: 50, baseX: 120, baseY: 60, vx: 2, vy: -1, width: 9 };
  const particle = { x: 40, y: 80, phase: 1.2 };
  const collection = [bee];
  scaleSceneCollections([collection, [particle]], 0.5, 2);
  assert.equal(collection[0], bee);
  assert.deepEqual(bee, { x: 50, y: 100, baseX: 60, baseY: 120, vx: 2, vy: -1, width: 9 });
  assert.deepEqual(particle, { x: 20, y: 160, phase: 1.2 });
});

test('habitat resize no longer requests a full habitat reinitialization', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../js/07-habitat-state.js', import.meta.url), 'utf8');
  assert.match(source, /scaleSceneCollections/);
  assert.doesNotMatch(source, /requestHabitatInit/);
});


test('habitat background silhouettes use one shared valley profile on initialization and resize', async () => {
  const silhouettes = createBackgroundSilhouettes(12);
  const expectedXs = [0, 3, 6, 9];
  const expectedHeights = expectedXs.map((x) => {
    const nx = x / 12;
    const valleyMask = 0.55 + Math.pow(Math.abs(nx - 0.5) * 1.8, 1.4) * 0.75;
    return Math.round((18 + Math.sin(x * 0.016) * 10 + Math.cos(x * 0.042) * 5) * valleyMask);
  });
  assert.deepEqual(silhouettes.map(({ x }) => x), expectedXs);
  assert.deepEqual(silhouettes.map(({ h }) => h), expectedHeights);

  const { readFile } = await import('node:fs/promises');
  const [stateSource, initializerSource] = await Promise.all([
    readFile(new URL('../js/07-habitat-state.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/habitat-initializer.js', import.meta.url), 'utf8'),
  ]);
  assert.match(stateSource, /createBackgroundSilhouettes\(pw\)/);
  assert.match(initializerSource, /createBackgroundSilhouettes\(pw\)/);
});
