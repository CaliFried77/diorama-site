import test from 'node:test';
import assert from 'node:assert/strict';

import { ARCTIC_LEDGE_LINKS, getArcticLandingY, getArcticLedges } from '../js/arctic-geometry.js';

test('Arctic geometry returns seven responsive ledges with stable ids', () => {
  for (const [width, height] of [[420, 240], [960, 540]]) {
    const ledges = getArcticLedges(width, height);

    assert.equal(ledges.length, 7);
    assert.deepEqual(ledges.map((ledge) => ledge.id), [0, 1, 2, 3, 4, 5, 6]);

    for (const ledge of ledges) {
      assert.ok(ledge.x1 < ledge.x2, `ledge ${ledge.id} has a valid horizontal span`);
      for (const x of [ledge.x1, (ledge.x1 + ledge.x2) / 2, ledge.x2]) {
        assert.ok(Number.isFinite(ledge.yFn(x)), `ledge ${ledge.id} returns a finite height`);
      }
    }
  }
});

test('Arctic fox navigation links reference existing ledges and are bidirectional', () => {
  const ledgeIds = new Set(getArcticLedges(420, 240).map((ledge) => ledge.id));

  assert.deepEqual(Object.keys(ARCTIC_LEDGE_LINKS).map(Number), [...ledgeIds]);
  for (const [from, destinations] of Object.entries(ARCTIC_LEDGE_LINKS)) {
    for (const destination of destinations) {
      assert.ok(ledgeIds.has(destination), `ledge ${destination} exists`);
      assert.ok(
        ARCTIC_LEDGE_LINKS[destination].includes(Number(from)),
        `connection ${from} <-> ${destination} is bidirectional`,
      );
    }
  }
});


test('cloudberries use the same ledge geometry as the Arctic foxes', () => {
  const width = 420;
  const height = 240;
  const leftMid = getArcticLedges(width, height)[2];
  const x = (leftMid.x1 + leftMid.x2) / 2;
  const platformLanding = getArcticLandingY(x, 40, width, height);
  const valleyLanding = getArcticLandingY(width / 2, 40, width, height);

  assert.equal(platformLanding, leftMid.yFn(x));
  assert.ok(valleyLanding > platformLanding);
});
