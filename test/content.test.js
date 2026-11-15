// Content integrity: every claim that carries numbers or part names must cite a
// registered source, and every cross-reference must resolve.
import test from 'node:test';
import assert from 'node:assert/strict';
import { components, componentById } from '../src/data/components.js';
import { systems } from '../src/data/systems.js';
import { journeys } from '../src/data/journeys.js';
import { sources } from '../src/data/sources.js';
import { labIds } from '../src/data/labs.js';

const known = id => assert.ok(sources[id], `unknown source id "${id}"`);

test('every source has a title, organisation, https url and check date', () => {
  for (const [id, s] of Object.entries(sources)) {
    assert.ok(s.title && s.org && s.kind, id);
    assert.match(s.url, /^https:\/\//, id);
    assert.match(s.checked, /^\d{4}-\d{2}-\d{2}$/, id);
  }
});

test('every component belongs to at least one system and has core fields', () => {
  for (const c of components) {
    assert.ok(c.systems.length > 0, `${c.id} is in no system`);
    for (const f of ['name', 'summary', 'how', 'plain', 'label']) assert.ok(c[f], `${c.id} missing ${f}`);
    assert.ok(c.decisions.length > 0, `${c.id} has no design decision`);
  }
});

test('rules, cases and decisions are sourced', () => {
  for (const c of components) {
    for (const r of c.rules) { assert.ok(r.id && r.text, c.id); known(r.source); }
    for (const k of c.cases) { assert.ok(k.team && k.text, c.id); known(k.source); }
    for (const d of c.decisions) {
      assert.ok(d.options.length >= 2, `${c.id}: "${d.q}" needs at least two options`);
      assert.ok(d.takeaway, `${c.id}: "${d.q}" needs a takeaway`);
      assert.ok(d.principle || (d.sources && d.sources.length), `${c.id}: "${d.q}" needs sources or principle:true`);
      (d.sources || []).forEach(known);
    }
    if (c.firmware) {
      for (const s of c.firmware.steps) {
        assert.ok(c.firmware.principle || (s.sources && s.sources.length), `${c.id}: firmware step "${s.title}" needs sources`);
        (s.sources || []).forEach(known);
      }
    }
  }
});

test('systems, journeys and labs only reference things that exist', () => {
  for (const s of systems) {
    s.parts.forEach(p => assert.ok(componentById[p], `${s.id} lists unknown part ${p}`));
    s.labs.forEach(l => assert.ok(labIds.includes(l), `${s.id} lists unknown lab ${l}`));
    s.sources.forEach(known);
  }
  for (const j of journeys) {
    j.steps.forEach(st => assert.ok(componentById[st.part], `${j.id} step uses unknown part ${st.part}`));
    j.sources.forEach(known);
  }
  for (const c of components) c.labs.forEach(l => assert.ok(labIds.includes(l), `${c.id} lists unknown lab ${l}`));
});
