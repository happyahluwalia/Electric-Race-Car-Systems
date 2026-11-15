import test from 'node:test';
import assert from 'node:assert/strict';
import { sizePack, limits2027 } from '../src/lib/pack.js';

// Molicel INR-21700-P45B data sheet values.
const p45b = { vMax: 4.2, vNom: 3.6, vMin: 2.5, ah: 4.5, aCont: 45, massG: 70 };

test('limits match Formula SAE Rules 2027 EV.3.3 and EV.5.1.1', () => {
  assert.deepEqual(limits2027, { maxVoltage: 600, maxPowerKw: 80, moduleVoltage: 120, moduleEnergyMJ: 6, moduleMassKg: 12 });
});

test('142 cells in series is the most a 4.2 V cell allows under 600 V', () => {
  assert.ok(sizePack(p45b, { series: 142, parallel: 4, modules: 1 }).vMax <= 600);
  assert.ok(sizePack(p45b, { series: 143, parallel: 4, modules: 1 }).vMax > 600);
});

test('figures quoted in the cell page: 511 V nominal and about 156 A at 80 kW', () => {
  const r = sizePack(p45b, { series: 142, parallel: 4, modules: 1 });
  assert.equal(Math.round(r.vNom), 511);
  assert.equal(Math.round(r.packAmpsAtLimit), 156);
  assert.ok(r.cellAmps <= 45, 'four in parallel is enough at nominal voltage');
  assert.ok(sizePack(p45b, { series: 142, parallel: 3, modules: 1 }).cellAmps > 45, 'three is not');
});

test('module limits are enforced, with energy defined as max stack voltage x nominal capacity', () => {
  const ok = sizePack(p45b, { series: 140, parallel: 4, modules: 7 });
  assert.equal(ok.cellsPerModule, 20);
  assert.ok(Math.abs(ok.modEnergyMJ - (20 * 4.2 * 4 * 4.5 * 3600) / 1e6) < 1e-9);
  assert.ok(Math.abs(ok.modCellMassKg - 5.6) < 1e-9);
  const moduleChecks = ok.checks.filter(c => /module/i.test(c.label));
  assert.equal(moduleChecks.length, 4);
  assert.ok(moduleChecks.every(c => c.ok), moduleChecks.filter(c => !c.ok).map(c => c.label).join(', '));
  // The lab's default 140s4p deliberately fails the empty-pack current check (57 A per cell at 2.5 V).
  assert.equal(ok.checks.find(c => c.label.includes('empty pack')).ok, false);
  const tooFew = sizePack(p45b, { series: 140, parallel: 4, modules: 4 });
  assert.equal(tooFew.checks.find(c => c.label.startsWith('Each module ≤ 120')).ok, false);
});

test('the 12 kg module mass cap is checked when cell mass is known', () => {
  const heavy = sizePack(p45b, { series: 24, parallel: 8, modules: 1 }); // 192 cells x 70 g = 13.4 kg
  assert.equal(heavy.checks.find(c => c.label.includes('12 kg')).ok, false);
  const unknown = sizePack({ ...p45b, massG: undefined }, { series: 24, parallel: 8, modules: 1 });
  assert.equal(unknown.checks.find(c => c.label.includes('12 kg')), undefined);
});
