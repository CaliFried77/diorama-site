import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeFocusSession,
  pauseFocusSession,
  remainingFocusSeconds,
  resetFocusSession,
  resumeFocusSession,
  startFocusSession,
} from '../js/focus-timer-state.js';

const baseTime = 1_800_000_000_000;

test('a running focus session keeps its deadline and remaining time after a page reload', () => {
  const started = startFocusSession(25 * 60, { habitat: 'Betta Akvaryumu', task: 'Okuma' }, baseTime);
  const restored = normalizeFocusSession(JSON.parse(JSON.stringify(started)), baseTime + 37_000);
  assert.equal(restored.status, 'running');
  assert.equal(restored.totalSec, 1500);
  assert.equal(restored.remainingSec, 1463);
  assert.equal(restored.habitat, 'Betta Akvaryumu');
  assert.equal(restored.task, 'Okuma');
});

test('pause and resume preserve the remaining time instead of restarting the duration', () => {
  const started = startFocusSession(45 * 60, {}, baseTime);
  const paused = pauseFocusSession(started, baseTime + 2 * 60_000);
  assert.equal(paused.status, 'paused');
  assert.equal(paused.remainingSec, 43 * 60);
  const resumed = resumeFocusSession(paused, baseTime + 10 * 60_000);
  assert.equal(resumed.status, 'running');
  assert.equal(remainingFocusSeconds(resumed, baseTime + 11 * 60_000), 42 * 60);
});

test('expired sessions restore as completed and do not become negative', () => {
  const started = startFocusSession(10 * 60, {}, baseTime);
  const expired = normalizeFocusSession(started, baseTime + 11 * 60_000);
  assert.equal(expired.status, 'completed');
  assert.equal(expired.remainingSec, 0);
});

test('stored values are bounded and reset returns to the selected duration', () => {
  const unsafe = normalizeFocusSession({ totalSec: 900_000, remainingSec: 900_000, status: 'paused', task: 'x'.repeat(500) });
  assert.equal(unsafe.totalSec, 180 * 60);
  assert.equal(unsafe.remainingSec, 180 * 60);
  assert.equal(unsafe.task.length, 180);
  const reset = resetFocusSession({ ...unsafe, remainingSec: 10 });
  assert.equal(reset.status, 'idle');
  assert.equal(reset.remainingSec, 180 * 60);
});
