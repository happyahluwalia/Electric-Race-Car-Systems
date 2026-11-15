import test from 'node:test';
import assert from 'node:assert/strict';
import { pec15, commandFrame, ltc6811Adcv, cellVolts } from '../src/lib/pec.js';
import { components } from '../src/data/components.js';

test('PEC15 matches the LTC6811 data sheet worked example (0x0001 -> 0x3D6E)', () => {
  assert.equal(pec15([0x00, 0x01]), 0x3d6e);
});

test('command frames are CMD0 CMD1 PEC0 PEC1', () => {
  assert.deepEqual(commandFrame(0x001), [0x00, 0x01, 0x3d, 0x6e]);
});

test('ADCV normal mode, all cells, discharge not permitted is 0x360', () => {
  assert.equal(ltc6811Adcv({ md: 2, dcp: 0, ch: 0 }), 0x360);
});

test('LTC6811 code 0x80E8 is 3.3 V (data sheet example)', () => {
  assert.ok(Math.abs(cellVolts('ltc6811', 0xe8, 0x80) - 3.3) < 1e-9);
});

test('ADBMS6830B code 0 is the 1.5 V offset and codes are signed', () => {
  assert.equal(cellVolts('adbms6830b', 0x00, 0x00), 1.5);
  assert.ok(Math.abs(cellVolts('adbms6830b', 0xff, 0xff) - (1.5 - 150e-6)) < 1e-9);
});

test('cleared registers decode to "no data", not a voltage', () => {
  assert.equal(cellVolts('ltc6811', 0xff, 0xff), null);
  assert.equal(cellVolts('adbms6830b', 0x00, 0x80), null);
});

test('frame bytes printed in the driver walkthrough are the computed ones', () => {
  const text = JSON.stringify(components.find(c => c.id === 'cellmonitor').firmware);
  for (const [name, code] of [['WRCFGA', 0x001], ['RDCVA', 0x004]]) {
    const bytes = commandFrame(code).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    assert.ok(text.includes(bytes), `${name} should be shown as ${bytes}`);
  }
});
