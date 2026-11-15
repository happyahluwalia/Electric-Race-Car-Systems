// Pack sizing arithmetic for the pack sizing lab. Limits are passed in so the
// rule values stay in one place (data) and the maths stays testable.
export const limits2024 = { maxVoltage: 600, maxPowerKw: 80, segmentVoltage: 120, segmentEnergyMJ: 6 };

export function sizePack(cell, { series, parallel, segments }, limits = limits2024) {
  const cellsPerSegment = series / segments;
  const vMax = series * cell.vMax;
  const vNom = series * cell.vNom;
  const vMin = series * cell.vMin;
  const energyWh = series * parallel * cell.ah * cell.vNom;
  const segVMax = cellsPerSegment * cell.vMax;
  const segEnergyMJ = (cellsPerSegment * parallel * cell.ah * cell.vNom * 3600) / 1e6;
  const packAmpsAtLimit = (limits.maxPowerKw * 1000) / vNom;
  const packAmpsAtLimitLow = (limits.maxPowerKw * 1000) / vMin;
  const cellAmps = packAmpsAtLimit / parallel;
  const cellAmpsLow = packAmpsAtLimitLow / parallel;
  const checks = [
    { label: 'Whole-number cells per segment', ok: Number.isInteger(cellsPerSegment), detail: `${series} ÷ ${segments} = ${+cellsPerSegment.toFixed(2)}` },
    { label: `Pack at full charge ≤ ${limits.maxVoltage} V`, ok: vMax <= limits.maxVoltage, detail: `${vMax.toFixed(1)} V` },
    { label: `Each segment < ${limits.segmentVoltage} V`, ok: segVMax < limits.segmentVoltage, detail: `${segVMax.toFixed(1)} V` },
    { label: `Each segment ≤ ${limits.segmentEnergyMJ} MJ`, ok: segEnergyMJ <= limits.segmentEnergyMJ, detail: `${segEnergyMJ.toFixed(2)} MJ` },
    { label: `Cell current at ${limits.maxPowerKw} kW within rating (nominal voltage)`, ok: cellAmps <= cell.aCont, detail: `${cellAmps.toFixed(1)} A of ${cell.aCont} A` },
    { label: `Cell current at ${limits.maxPowerKw} kW within rating (empty pack)`, ok: cellAmpsLow <= cell.aCont, detail: `${cellAmpsLow.toFixed(1)} A of ${cell.aCont} A` }
  ];
  return { cellsPerSegment, vMax, vNom, vMin, energyWh, segVMax, segEnergyMJ, packAmpsAtLimit, cellAmps, cellAmpsLow, checks, cells: series * parallel };
}
