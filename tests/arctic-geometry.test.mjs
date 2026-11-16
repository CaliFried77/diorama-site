import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCTIC_LEDGE_LINKS, getArcticGroundY, getArcticLandingY, getArcticLedges } from '../js/arctic-geometry.js';

test('Arctic ledge geometry exposes seven stable, bounded platform IDs', () => {
  const width = 420;
  const height = 240;
  const ledges = getArcticLedges(width, height);

  assert.deepEqual(ledges.map((ledge) => ledge.id), [0, 1, 2, 3, 4, 5, 6]);
  for (const ledge of ledges) {
    assert.ok(ledge.x1 >= 0 && ledge.x1 < width);
    assert.ok(ledge.x2 > ledge.x1 && ledge.x2 <= width);
    for (const x of [ledge.x1, Math.round((ledge.x1 + ledge.x2) / 2), ledge.x2]) {
      assert.ok(Number.isFinite(ledge.yFn(x)), 'ledge ' + ledge.id + ' should have a finite surface');
    }
  }
});

test('main Arctic floor and ground helper use the same curved height', () => {
  const width = 420;
  const height = 240;
  const floor = getArcticLedges(width, height)[0];

  for (const x of [60, 110, 210, 310, 360]) {
    assert.equal(floor.yFn(x), getArcticGroundY(x, width, height));
  }
});

test('cloudberry landing uses the exact nearest fox navigation surface below the click', () => {
  const width = 420;
  const height = 240;
  const ledges = getArcticLedges(width, height);
  const x = Math.round(width * 0.28);
  const clickY = Math.round(height * 0.34);
  const expectedLedge = ledges.find((ledge) => ledge.id === 2);
  const landingY = getArcticLandingY(x, clickY, width, height);

  assert.equal(landingY, expectedLedge.yFn(x));
  assert.equal(landingY, getArcticLedges(width, height)[2].yFn(x));
});

test('Arctic ledge navigation links remain symmetric and reference valid platforms', () => {
  for (const [from, destinations] of Object.entries(ARCTIC_LEDGE_LINKS)) {
    assert.ok(Number(from) >= 0 && Number(from) <= 6);
    for (const to of destinations) {
      assert.ok(ARCTIC_LEDGE_LINKS[to]?.includes(Number(from)), from + ' ↔ ' + to);
    }
  }
});
