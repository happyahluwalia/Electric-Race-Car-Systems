// Cascadia Motion (PM100 family) CAN frames as laid out in two public Formula SAE
// drivers: lflaherty/ev-ecu (cInverterCAN.h, dataConversions.h) and
// SCFormulaElectric/vcu_stm32 (can_protocol.h, motor_controller_task.c).
// Multi-byte fields are little-endian. Most physical values are 16-bit with a
// 0.1 scale (°C, A, V, degrees, Nm, Hz); flux is 0.001 Wb; speed is a signed rpm.
// Confirm against the Cascadia CAN protocol document for your firmware version.

const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const i16 = (b, i) => (u16(b, i) << 16) >> 16;
const u32 = (b, i) => (u16(b, i) | (u16(b, i + 2) << 16)) >>> 0;
const tenth = v => v / 10;

export const broadcast = {
  0x0A0: { name: 'Temperatures 1', fields: [['Module A', 'u16', 0.1, '°C'], ['Module B', 'u16', 0.1, '°C'], ['Module C', 'u16', 0.1, '°C'], ['Gate driver board', 'u16', 0.1, '°C']] },
  0x0A1: { name: 'Temperatures 2', fields: [['Control board', 'u16', 0.1, '°C'], ['reserved', 'u16', 1, ''], ['reserved', 'u16', 1, ''], ['reserved', 'u16', 1, '']] },
  0x0A2: { name: 'Temperatures 3', fields: [['reserved', 'u16', 1, ''], ['reserved', 'u16', 1, ''], ['Motor', 'u16', 0.1, '°C'], ['reserved', 'u16', 1, '']] },
  0x0A5: { name: 'Motor position', fields: [['Motor angle', 'u16', 0.1, '°'], ['Motor speed', 'i16', 1, 'rpm'], ['Electrical output frequency', 'u16', 0.1, 'Hz'], ['reserved', 'u16', 1, '']] },
  0x0A6: { name: 'Current', fields: [['Phase A', 'i16', 0.1, 'A'], ['Phase B', 'i16', 0.1, 'A'], ['Phase C', 'i16', 0.1, 'A'], ['DC bus', 'i16', 0.1, 'A']] },
  0x0A7: { name: 'Voltage', fields: [['DC bus', 'u16', 0.1, 'V'], ['Output voltage', 'u16', 0.1, 'V'], ['Vd', 'u16', 0.1, 'V'], ['Vq', 'u16', 0.1, 'V']] },
  0x0A8: { name: 'Flux', fields: [['Flux command', 'u16', 0.001, 'Wb'], ['Flux feedback', 'u16', 0.001, 'Wb'], ['Id feedback', 'i16', 0.1, 'A'], ['Iq feedback', 'i16', 0.1, 'A']] },
  0x0AC: { name: 'Torque and timer', fields: [['Commanded torque', 'u16', 0.1, 'Nm'], ['Feedback torque', 'u16', 0.1, 'Nm'], ['Timer', 'u32', 1, 'counts']] }
};

export function decodeBroadcast(id, bytes) {
  const spec = broadcast[id];
  if (!spec) return null;
  const out = []; let i = 0;
  for (const [label, type, scale, unit] of spec.fields) {
    const raw = type === 'u16' ? u16(bytes, i) : type === 'i16' ? i16(bytes, i) : u32(bytes, i);
    i += type === 'u32' ? 4 : 2;
    if (label !== 'reserved') out.push({ label, raw, value: +(raw * scale).toFixed(3), unit });
  }
  return { name: spec.name, fields: out };
}

// 0x0AB: two 32-bit fault words, one-hot bits. Any non-zero bit is a fault.
export function decodeFaults(bytes) {
  const post = u32(bytes, 0), run = u32(bytes, 4);
  return { postFault: post, runFault: run, any: (post | run) !== 0 };
}

// 0x0AA: VSM state, inverter state, relay state and flags.
export function decodeStates(bytes) {
  return {
    vsmState: bytes[0], inverterState: bytes[2], relayState: bytes[3],
    runMode: bytes[4] & 1, activeDischargeState: (bytes[4] >> 5) & 7,
    inverterEnabled: bytes[6] & 1, direction: bytes[7] & 1
  };
}

// 0x0C0 command: torque (0.1 Nm, signed), speed (rpm, signed), direction byte,
// flag byte (bit0 enable, bit1 discharge, bit2 speed mode), torque limit (0.1 Nm; 0 = inverter EEPROM limits).
export function encodeCommand({ torqueNm = 0, speedRpm = 0, direction = 1, enable = false, discharge = false, speedMode = false, torqueLimNm = 0 }) {
  const t = Math.round(torqueNm * 10), s = Math.round(speedRpm), l = Math.round(torqueLimNm * 10);
  const flags = (enable ? 1 : 0) | (discharge ? 2 : 0) | (speedMode ? 4 : 0);
  return [t & 0xff, (t >> 8) & 0xff, s & 0xff, (s >> 8) & 0xff, direction & 0xff, flags, l & 0xff, (l >> 8) & 0xff];
}

export function decodeCommand(bytes) {
  return {
    torqueNm: tenth(i16(bytes, 0)), speedRpm: i16(bytes, 2), direction: bytes[4],
    enable: !!(bytes[5] & 1), discharge: !!(bytes[5] & 2), speedMode: !!(bytes[5] & 4), torqueLimNm: tenth(i16(bytes, 6))
  };
}

export const hexBytes = b => b.map(x => x.toString(16).padStart(2, '0').toUpperCase()).join(' ');
export const parseBytes = s => s.trim().split(/[\s,]+/).filter(Boolean).map(x => parseInt(x, 16) & 0xff);
