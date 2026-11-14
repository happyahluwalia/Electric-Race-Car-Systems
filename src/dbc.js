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
    const signal = line.match(/^\s*SG_\s+(\w+)(?:\s+\w+)?\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(([-+\deE.]+),\s*([-+\deE.]+)\)\s*\[([^|]+)\|([^\]]+)\]\s*"([^"]*)"/);
    if (signal && current) {
      current.signals.push({
        name: signal[1], start: Number(signal[2]), length: Number(signal[3]),
        littleEndian: signal[4] === '1', signed: signal[5] === '-',
        factor: Number(signal[6]), offset: Number(signal[7]),
        min: signal[8], max: signal[9], unit: signal[10]
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
