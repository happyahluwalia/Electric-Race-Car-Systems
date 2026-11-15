import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeCommand, decodeCommand, decodeBroadcast, decodeFaults, decodeStates, hexBytes, parseBytes } from '../src/lib/cascadia.js';

test('command frame matches the ev-ecu struct layout: 12.5 Nm forward, enabled', () => {
  // torqueToMsg(12.5) = 125 = 0x007D little-endian; direction byte; flag byte bit0; torqueLim 0 (EEPROM limits)
  const b = encodeCommand({ torqueNm: 12.5, direction: 1, enable: true });
  assert.equal(hexBytes(b), '7D 00 00 00 01 01 00 00');
  assert.deepEqual(decodeCommand(b), { torqueNm: 12.5, speedRpm: 0, direction: 1, enable: true, discharge: false, speedMode: false, torqueLimNm: 0 });
});

test('a free-roll command is all zeros and the discharge flag is bit 1', () => {
  assert.equal(hexBytes(encodeCommand({})), '00 00 00 00 01 00 00 00'.replace('01', '01'));
  assert.equal(encodeCommand({ direction: 0 }).every(x => x === 0), true);
  assert.equal(encodeCommand({ discharge: true, direction: 0 })[5], 2);
});

test('broadcast values are little-endian with 0.1 scaling; speed is a signed rpm', () => {
  // 0x0A7: DC bus 0x0F3C = 3900 -> 390.0 V
  const v = decodeBroadcast(0x0A7, [0x3C, 0x0F, 0, 0, 0, 0, 0, 0]);
  assert.equal(v.fields[0].value, 390);
  // 0x0A5: angle 0x0708 = 1800 -> 180.0 deg, speed 0xFF38 -> -200 rpm, freq 0x01F4 = 500 -> 50.0 Hz
  const p = decodeBroadcast(0x0A5, [0x08, 0x07, 0x38, 0xFF, 0xF4, 0x01, 0, 0]);
  assert.deepEqual(p.fields.map(f => f.value), [180, -200, 50]);
  // 0x0A6: phase A -0.1 A
  assert.equal(decodeBroadcast(0x0A6, [0xFF, 0xFF, 0, 0, 0, 0, 0, 0]).fields[0].value, -0.1);
});

test('fault frame is two one-hot 32-bit words', () => {
  assert.deepEqual(decodeFaults([0, 0, 0, 0, 0, 0, 0, 0]), { postFault: 0, runFault: 0, any: false });
  const f = decodeFaults([0, 0, 0, 0, 0x04, 0, 0, 0]);
  assert.equal(f.runFault, 4);
  assert.equal(f.any, true);
});

test('internal states: enabled flag is bit 0 of byte 6', () => {
  const s = decodeStates([5, 0, 6, 1, 0x61, 0, 1, 1]);
  assert.equal(s.vsmState, 5); assert.equal(s.inverterState, 6); assert.equal(s.inverterEnabled, 1);
  assert.equal(s.activeDischargeState, 3); assert.equal(s.runMode, 1); assert.equal(s.direction, 1);
});

test('hex parsing round-trips', () => {
  assert.equal(hexBytes(parseBytes('7d 00 00 00 01 01 00 00')), '7D 00 00 00 01 01 00 00');
});
