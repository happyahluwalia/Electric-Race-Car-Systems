import test from 'node:test';
import assert from 'node:assert/strict';
import { assemblies } from '../src/data/assemblies.js';
import { sources } from '../src/data/sources.js';
import { componentById } from '../src/data/components.js';

test('every assembly part is sourced or marked as reasoning, and links to a real part page', () => {
  for (const a of assemblies) {
    a.sources.forEach(s => assert.ok(sources[s], `${a.id}: unknown source ${s}`));
    for (const p of a.parts) {
      for (const f of ['what', 'why', 'fails']) assert.ok(p[f] && p[f].length > 20, `${a.id}.${p.id} needs ${f}`);
      assert.ok(p.principle || (p.sources && p.sources.length), `${a.id}.${p.id} needs sources or principle:true`);
      (p.sources || []).forEach(s => assert.ok(sources[s], `${a.id}.${p.id}: unknown source ${s}`));
      if (p.rule) assert.match(p.rule.id, /^(EV|T)\.\d+(\.\d+)*$/);
      assert.ok(componentById[p.link], `${a.id}.${p.id} links to unknown part ${p.link}`);
      assert.equal(p.explode.length, 3);
    }
    for (const f of a.flows) f.parts.forEach(id => assert.ok(a.parts.some(p => p.id === id), `${a.id} flow ${f.id}: unknown part ${id}`));
    assert.ok(a.quiz.length >= 3);
    a.quiz.forEach(q => assert.ok(q.answer >= 0 && q.answer < q.options.length && q.why));
  }
});

test('battery module numbers in the intro hold for 20s4p P45B cells', () => {
  const s = 20, p = 4, vmax = 4.2, ah = 4.5, g = 70;
  assert.equal(s * vmax, 84);
  assert.equal(Math.round(s * vmax * p * ah * 3600 / 1e5) / 10, 5.4);
  assert.equal(s * p * g / 1000, 5.6);
});
