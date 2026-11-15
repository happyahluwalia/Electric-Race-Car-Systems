export function parseDbc(source) {
  const messages = [];
  let current = null;
  for (const line of source.split(/\r?\n/)) {
    const message = line.match(/^\s*BO_\s+(\d+)\s+(\S+)\s*:\s*(\d+)\s+(\S+)/);
    if (message) {
      current = { id: Number(message[1]), name: message[2].replace(/:$/, ''), dlc: Number(message[3]), sender: message[4], signals: [] };
      messages.push(current);
      continue;
    }
    const signal = line.match(/^\s*SG_\s+(\w+)(?:\s+(M|m\d+))?\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(([-+\deE.]+),\s*([-+\deE.]+)\)\s*\[([^|]+)\|([^\]]+)\]\s*"([^"]*)"/);
    if (signal && current) {
      current.signals.push({
        name: signal[1],
        // multiplexing: 'M' marks the selector signal; mN means "only present when the selector is N"
        mux: signal[2] === 'M' ? 'M' : signal[2] ? Number(signal[2].slice(1)) : null,
        start: Number(signal[3]), length: Number(signal[4]),
        littleEndian: signal[5] === '1', signed: signal[6] === '-',
        factor: Number(signal[7]), offset: Number(signal[8]),
        min: signal[9], max: signal[10], unit: signal[11]
      });
    }
  }
  return messages;
}

export function parseHexBytes(input) {
  const parts = input.trim().split(/[\s,;]+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 8 || parts.some(part => !/^(?:0x)?[0-9a-f]{1,2}$/i.test(part))) return null;
  return parts.map(part => Number.parseInt(part.replace(/^0x/i, ''), 16));
}

export function decodeSignal(signal, bytes) {
  if (!bytes || signal.length < 1 || signal.length > 64 || signal.start < 0) return null;
  let raw = 0n;
  if (signal.littleEndian) {
    for (let i = 0; i < signal.length; i += 1) {
      const bit = signal.start + i;
      const byte = bytes[Math.floor(bit / 8)];
      if (byte === undefined) return null;
      raw |= BigInt((byte >> (bit % 8)) & 1) << BigInt(i);
    }
  } else {
    let bit = signal.start;
    for (let i = 0; i < signal.length; i += 1) {
      const byte = bytes[Math.floor(bit / 8)];
      if (byte === undefined) return null;
      // DBC Motorola start bits use LSB0 numbering within each byte;
      // traverse from the signal MSB toward lower bit numbers.
      raw = (raw << 1n) | BigInt((byte >> (bit % 8)) & 1);
      bit = bit % 8 === 0 ? bit + 15 : bit - 1;
    }
  }
  if (signal.signed && (raw & (1n << BigInt(signal.length - 1))) !== 0n) {
    raw -= 1n << BigInt(signal.length);
  }
  const rawNumber = Number(raw);
  const physical = rawNumber * signal.factor + signal.offset;
  return {
    raw: raw.toString(),
    rawNumber,
    physical,
    value: physical,
    precisionWarning: !Number.isSafeInteger(rawNumber)
  };
}

// Which signals of a message are actually present in this frame. Plain signals always
// are; a multiplexed signal mN only when the selector signal (M) currently reads N.
export function presentSignals(message, bytes) {
  const selector = message.signals.find(s => s.mux === 'M');
  const sel = selector ? decodeSignal(selector, bytes) : null;
  const value = sel ? sel.rawNumber : null;
  return message.signals.map(s => ({ ...s, present: s.mux === null || s.mux === 'M' || s.mux === value, selectorValue: value }));
}

// Inverse of decodeSignal: write a physical value into a byte array (used to build
// example payloads from the DBC itself, so the bytes and the decoder cannot disagree).
export function encodeSignal(signal, physical, bytes) {
  let raw = BigInt(Math.round((physical - signal.offset) / signal.factor));
  if (raw < 0n) raw += 1n << BigInt(signal.length);
  const out = [...bytes];
  if (signal.littleEndian) {
    for (let i = 0; i < signal.length; i += 1) {
      const bit = signal.start + i, b = Math.floor(bit / 8), m = 1 << (bit % 8);
      out[b] = Number((raw >> BigInt(i)) & 1n) ? out[b] | m : out[b] & ~m;
    }
  } else {
    let bit = signal.start;
    for (let i = signal.length - 1; i >= 0; i -= 1) {
      const b = Math.floor(bit / 8), m = 1 << (bit % 8);
      out[b] = Number((raw >> BigInt(i)) & 1n) ? out[b] | m : out[b] & ~m;
      bit = bit % 8 === 0 ? bit + 15 : bit - 1;
    }
  }
  return out;
}

// VAL_ <id> <signal> <n> "label" ... ;  ->  { "id:signal": { n: label } }
export function parseValueTables(source) {
  const out = {};
  for (const m of source.matchAll(/^\s*VAL_\s+(\d+)\s+(\w+)\s+([^;]*);/gm)) {
    const table = {};
    for (const p of m[3].matchAll(/(-?\d+)\s+"([^"]*)"/g)) table[Number(p[1])] = p[2];
    out[`${m[1]}:${m[2]}`] = table;
  }
  return out;
}
