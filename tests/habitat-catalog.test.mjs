import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  HABITATS,
  HABITAT_CREATURE_PROFILES,
  HABITAT_INTERACTION_PROFILES,
  HABITAT_SCENE_PROFILES,
} from '../config/habitat-catalog.js';

test('Arctic Aurora registers its scene, creature, and interaction profiles', async () => {
  const arctic = HABITATS.find((habitat) => habitat.id === 'arctic-aurora');

  assert.ok(arctic, 'Arctic Aurora habitat should exist');
  assert.ok(HABITAT_SCENE_PROFILES.includes(arctic.sceneProfile));
  assert.ok(HABITAT_CREATURE_PROFILES.includes(arctic.creatureProfile));
  assert.ok(HABITAT_INTERACTION_PROFILES.includes(arctic.interactionProfile));

  const [scenery, creatures, interactions, entrypoint] = await Promise.all([
    readFile(new URL('../js/09-scenery.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/08-creatures.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/habitat-interactions.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/main.js', import.meta.url), 'utf8'),
  ]);

  assert.match(scenery, /hab\.sceneProfile === 'arctic-tundra'/);
  assert.match(scenery, /new PixelArcticFox\(\)/);
  assert.match(creatures, /export class PixelArcticFox/);
  assert.match(interactions, /interactionProfile === 'cloudberry'/);
  assert.match(interactions, /canvas\.addEventListener\('pointerdown'/);
  assert.match(interactions, /export function drawHabitatStimuli\(\)/);
  assert.match(scenery, /drawHabitatStimuli\(\)/);
  assert.match(entrypoint, /import '\.\/habitat-interactions\.js';/);
  assert.match(interactions, /s\.type === 'cloudberry'/);
});
