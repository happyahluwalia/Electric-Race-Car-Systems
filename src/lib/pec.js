// PEC15: the 15-bit packet error code used for command frames by Analog Devices
// LTC681x and ADBMS68xx battery monitors.
// Polynomial x^15 + x^14 + x^10 + x^8 + x^7 + x^4 + x^3 + 1, initial value 0x0010.
// The 15-bit result is transmitted with a 0 appended as the least significant bit.
// Reference: LTC6811 data sheet, "Packet Error Code" (worked example 0x0001 -> 0x3D6E).
const POLY = 0x4599;

export function pec15(bytes) {
  let rem = 0x0010;
  for (const byte of bytes) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      const din = (byte >> bit) & 1;
      const in0 = din ^ ((rem >> 14) & 1);
      rem = (rem << 1) & 0x7fff;
      if (in0) rem ^= POLY;
    }
  }
  return (rem << 1) & 0xffff;
}

// Four bytes on the wire for a broadcast command: CMD0, CMD1, PEC0, PEC1.
export function commandFrame(code) {
  const cmd = [(code >> 8) & 0x07, code & 0xff];
  const pec = pec15(cmd);
  return [...cmd, pec >> 8, pec & 0xff];
}

// LTC6811 ADCV command code from its option bits.
// Format: 0 1 MD1 MD0 1 1 DCP 0 CH2 CH1 CH0
export function ltc6811Adcv({ md = 2, dcp = 0, ch = 0 } = {}) {
  return 0x260 | ((md & 3) << 7) | ((dcp & 1) << 4) | (ch & 7);
}

// Register code (two bytes, low byte first) to volts.
export function cellVolts(chip, lo, hi) {
  const raw = (hi << 8) | lo;
  if (chip === 'ltc6811') {
    if (raw === 0xffff) return null; // cleared register
    return raw * 100e-6;
  }
  if (chip === 'adbms6830b') {
    if (raw === 0x8000) return null; // cleared register
    const signed = raw >= 0x8000 ? raw - 0x10000 : raw;
    return signed * 150e-6 + 1.5;
  }
  throw new Error('unknown chip ' + chip);
}

export const hex = (n, width = 2) => n.toString(16).toUpperCase().padStart(width, '0');
