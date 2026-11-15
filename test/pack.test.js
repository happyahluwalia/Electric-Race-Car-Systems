import test from 'node:test';
import assert from 'node:assert/strict';
import { sizePack } from '../src/lib/pack.js';

const p45b = { vMax: 4.2, vNom: 3.6, vMin: 2.5, ah: 4.5, aCont: 45 };

test('142 cells in series is the most a 4.2 V cell allows under 600 V', () => {
  assert.ok(sizePack(p45b, { series: 142, parallel: 4, segments: 1 }).vMax <= 600);
  assert.ok(sizePack(p45b, { series: 143, parallel: 4, segments: 1 }).vMax > 600);
});

test('figures quoted in the cell page: 511 V nominal and about 156 A at 80 kW', () => {
  const r = sizePack(p45b, { series: 142, parallel: 4, segments: 1 });
  assert.equal(Math.round(r.vNom), 511);
  assert.equal(Math.round(r.packAmpsAtLimit), 156);
  assert.ok(r.cellAmps <= 45, 'four in parallel is enough at nominal voltage');
  assert.ok(sizePack(p45b, { series: 142, parallel: 3, segments: 1 }).cellAmps > 45, 'three is not');
});

test('segment limits are enforced', () => {
  const ok = sizePack(p45b, { series: 140, parallel: 4, segments: 7 });
  assert.equal(ok.cellsPerSegment, 20);
  assert.ok(ok.checks.slice(0, 4).every(c => c.ok));
  const tooFew = sizePack(p45b, { series: 140, parallel: 4, segments: 4 });
  assert.equal(tooFew.checks.find(c => c.label.startsWith('Each segment <')).ok, false);
});
