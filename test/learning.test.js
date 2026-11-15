import test from 'node:test';
import assert from 'node:assert/strict';
import { components, componentById } from '../src/data/components.js';
import { checks } from '../src/data/checks.js';
import { paths, prerequisites } from '../src/data/paths.js';
import { systemById } from '../src/data/systems.js';
import { journeyById } from '../src/data/journeys.js';
import { labById } from '../src/data/labs.js';

test('every part has at least two self-check questions with a valid answer and explanation', () => {
  for (const c of components) {
    const qs = checks[c.id];
    assert.ok(qs && qs.length >= 2, `${c.id} needs at least two questions`);
    for (const q of qs) {
      assert.ok(q.options.length >= 2 && new Set(q.options).size === q.options.length, `${c.id}: "${q.q}" options must be distinct`);
      assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${c.id}: "${q.q}" answer out of range`);
      assert.ok(q.why && q.why.length > 5, `${c.id}: "${q.q}" needs an explanation`);
    }
  }
  for (const id of Object.keys(checks)) assert.ok(componentById[id], `checks for unknown part ${id}`);
});

test('paths and prerequisites only point at things that exist', () => {
  const exists = { system: systemById, part: componentById, journey: journeyById, lab: labById };
  for (const p of paths) for (const s of p.steps) assert.ok(exists[s.kind][s.id], `${p.id}: unknown ${s.kind} ${s.id}`);
  for (const [id, before] of Object.entries(prerequisites)) {
    assert.ok(componentById[id], `prerequisites for unknown part ${id}`);
    before.forEach(b => { assert.ok(componentById[b], `${id} needs unknown part ${b}`); assert.notEqual(b, id); });
  }
});

test('the arithmetic in self-check answers holds', () => {
  assert.ok(142 * 4.2 <= 600 && 143 * 4.2 > 600);
  assert.equal(Math.round(45 ** 2 * 0.015), 30);
  assert.equal(600 * 500, 300000);
  assert.ok(Math.abs(0x80e8 * 100e-6 - 3.3) < 1e-9);
  assert.ok(Math.abs(1 - Math.exp(-2.3) - 0.9) < 0.002);
});
