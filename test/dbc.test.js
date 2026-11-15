import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDbc, parseHexBytes, decodeSignal } from '../src/lib/dbc.js';

const sample = [
  'VERSION "test"',
  'BO_ 256 Status: 8 VCU',
  ' SG_ Little : 0|16@1+ (0.1,0) [0|6553.5] "Nm" Inverter',
  ' SG_ Signed : 16|16@1- (1,0) [-32768|32767] "A" Inverter',
  ' SG_ Motorola : 39|16@0+ (1,0) [0|65535] "raw" Inverter'
].join('\n');

test('parses message and signal metadata', () => {
  const messages = parseDbc(sample);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, 256);
  assert.equal(messages[0].signals.length, 3);
  assert.equal(messages[0].signals[0].name, 'Little');
  assert.equal(messages[0].signals[0].factor, 0.1);
});

test('decodes little-endian unsigned values and scaling', () => {
  const signal = parseDbc(sample)[0].signals[0];
  const decoded = decodeSignal(signal, [0xD2, 0x04, 0, 0, 0, 0, 0, 0]);
  assert.equal(decoded.raw, '1234');
  assert.equal(decoded.physical, 123.4);
});

test('decodes little-endian signed two-complement values', () => {
  const signal = parseDbc(sample)[0].signals[1];
  const decoded = decodeSignal(signal, [0, 0, 0xFF, 0xFF, 0, 0, 0, 0]);
  assert.equal(decoded.raw, '-1');
  assert.equal(decoded.physical, -1);
});

test('decodes Motorola big-endian bit traversal', () => {
  const signal = parseDbc(sample)[0].signals[2];
  const decoded = decodeSignal(signal, [0, 0, 0, 0, 0x12, 0x34, 0, 0]);
  assert.equal(decoded.raw, '4660');
});

test('rejects malformed hex payloads', () => {
  assert.equal(parseHexBytes('AA GG 01'), null);
  assert.equal(parseHexBytes('AA BB CC DD EE FF 00 11 22'), null);
  assert.deepEqual(parseHexBytes('0x0A, FF 12'), [10, 255, 18]);
});

test('rejects signal extraction beyond available payload', () => {
  const signal = { start: 60, length: 16, littleEndian: true, signed: false, factor: 1, offset: 0 };
  assert.equal(decodeSignal(signal, [0, 0, 0, 0, 0, 0, 0, 0]), null);
});

// Real file from commaai/opendbc (MIT). Cell voltages are multiplexed three per frame.
import { readFileSync } from 'node:fs';
import { presentSignals, encodeSignal } from '../src/lib/dbc.js';
const gm = parseDbc(readFileSync(new URL('../src/data/dbc/gm_global_a_high_voltage_management.dbc', import.meta.url), 'utf8'));

test('parses the opendbc GM high-voltage DBC including multiplexed signals', () => {
  const m1 = gm.find(m => m.id === 512);
  assert.equal(m1.name, 'Battery_Module_1');
  assert.equal(m1.signals.length, 25);
  const sel = m1.signals.find(s => s.mux === 'M');
  assert.equal(sel.name, 'Cell_Bank_Number_1');
  assert.equal(m1.signals.filter(s => s.mux === 3).length, 3);
  assert.equal(m1.signals[0].factor, 0.00125);
});

test('encode then decode round-trips, and only the selected bank is present', () => {
  const m1 = gm.find(m => m.id === 512);
  const sig = n => m1.signals.find(s => s.name === n);
  let b = [0, 0, 0, 0, 0, 0, 0, 0];
  b = encodeSignal(sig('Cell_Bank_Number_1'), 2, b);
  b = encodeSignal(sig('Voltage_1_2_A'), 3.7, b);
  b = encodeSignal(sig('Voltage_1_2_B'), 3.69875, b);
  b = encodeSignal(sig('Voltage_1_2_C'), 4.1, b);
  assert.equal(decodeSignal(sig('Voltage_1_2_A'), b).physical, 3.7);
  assert.ok(Math.abs(decodeSignal(sig('Voltage_1_2_C'), b).physical - 4.1) < 1e-9);
  const present = presentSignals(m1, b).filter(s => s.present).map(s => s.name);
  assert.deepEqual(present.sort(), ['Cell_Bank_Number_1', 'Voltage_1_2_A', 'Voltage_1_2_B', 'Voltage_1_2_C']);
});

test('signed little-endian and offset signals encode correctly', () => {
  const t = gm.find(m => m.id === 770).signals.find(s => s.name === 'Temp_A');
  assert.equal(decodeSignal(t, encodeSignal(t, 25, [0, 0, 0, 0, 0, 0, 0, 0])).physical, 25);
  const i = gm.find(m => m.id === 528).signals.find(s => s.name === 'Pack_Current');
  assert.ok(Math.abs(decodeSignal(i, encodeSignal(i, -5, [0, 0, 0, 0, 0, 0, 0, 0])).physical - -5) < 1e-9);
});

import { parseValueTables } from '../src/lib/dbc.js';
test('value tables give names to enumerated values', () => {
  const v = parseValueTables(readFileSync(new URL('../src/data/dbc/gm_global_a_high_voltage_management.dbc', import.meta.url), 'utf8'));
  assert.equal(v['782:Command'][3], '12V_and_HV');
  assert.equal(v['776:Status'][0], 'Off');
});
