import test from 'node:test';
import assert from 'node:assert/strict';
import { findAvailableStimulusIn } from '../js/creature-targeting.js';

test('a live stimulus can be claimed by only one creature', () => {
  const firstCreature = { x: 0, y: 0, eatCooldown: 0 };
  const secondCreature = { x: 1, y: 0, eatCooldown: 0 };
  const stimulus = { type: 'nectar', x: 4, y: 0, life: 20 };
  const stimuli = [stimulus];

  assert.equal(findAvailableStimulusIn(firstCreature, 'nectar', 20, stimuli), stimulus);
  assert.equal(stimulus.claimedBy, firstCreature);
  assert.equal(findAvailableStimulusIn(secondCreature, 'nectar', 20, stimuli), null);
  assert.equal(findAvailableStimulusIn(firstCreature, 'nectar', 20, stimuli), stimulus);
});

test('expired and wrong-type stimuli cannot be claimed', () => {
  const creature = { x: 0, y: 0, eatCooldown: 0 };
  const expired = { type: 'nectar', x: 1, y: 0, life: 0 };
  const wrongType = { type: 'fruit', x: 1, y: 0, life: 20 };

  assert.equal(findAvailableStimulusIn(creature, 'nectar', 20, [expired, wrongType]), null);
  assert.equal(expired.claimedBy, undefined);
  assert.equal(wrongType.claimedBy, undefined);
});

test('stimuli outside range and creatures on cooldown do not acquire a claim', () => {
  const creature = { x: 0, y: 0, eatCooldown: 10 };
  const stimulus = { type: 'nectar', x: 30, y: 0, life: 20 };

  assert.equal(findAvailableStimulusIn(creature, 'nectar', 20, [stimulus]), null);
  creature.eatCooldown = 0;
  assert.equal(findAvailableStimulusIn(creature, 'nectar', 20, [stimulus]), null);
  assert.equal(stimulus.claimedBy, undefined);
});
