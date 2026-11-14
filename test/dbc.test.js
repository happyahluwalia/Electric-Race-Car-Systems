import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDbc, parseHexBytes, decodeSignal } from '../src/dbc.js';

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
