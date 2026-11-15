// Pack sizing arithmetic for the pack sizing lab. Limits are passed in so the
// rule values stay in one place (data) and the maths stays testable.
// Formula SAE Rules 2027 V1.0: EV.3.3.2 (600 V), EV.3.3.1 (80 kW), EV.5.1.1 (module: 120 V, 6 MJ, 12 kg).
export const limits2027 = { maxVoltage: 600, maxPowerKw: 80, moduleVoltage: 120, moduleEnergyMJ: 6, moduleMassKg: 12 };

export function sizePack(cell, { series, parallel, modules }, limits = limits2027) {
  const cellsPerModule = series / modules;
  const vMax = series * cell.vMax;
  const vNom = series * cell.vNom;
  const vMin = series * cell.vMin;
  const energyWh = series * parallel * cell.ah * cell.vNom;
  const modVMax = cellsPerModule * cell.vMax;
  // EV.5.1.1: contained energy = maximum stack voltage x nominal capacity of the cells
  const modEnergyMJ = (modVMax * parallel * cell.ah * 3600) / 1e6;
  const modCellMassKg = cell.massG ? (cellsPerModule * parallel * cell.massG) / 1000 : null;
  const packAmpsAtLimit = (limits.maxPowerKw * 1000) / vNom;
  const packAmpsAtLimitLow = (limits.maxPowerKw * 1000) / vMin;
  const cellAmps = packAmpsAtLimit / parallel;
  const cellAmpsLow = packAmpsAtLimitLow / parallel;
  const checks = [
    { label: 'Whole-number cells per module', ok: Number.isInteger(cellsPerModule), detail: `${series} ÷ ${modules} = ${+cellsPerModule.toFixed(2)}` },
    { label: `Pack at full charge ≤ ${limits.maxVoltage} V (EV.3.3.2)`, ok: vMax <= limits.maxVoltage, detail: `${vMax.toFixed(1)} V` },
    { label: `Each module ≤ ${limits.moduleVoltage} V (EV.5.1.1)`, ok: modVMax <= limits.moduleVoltage, detail: `${modVMax.toFixed(1)} V` },
    { label: `Each module ≤ ${limits.moduleEnergyMJ} MJ (EV.5.1.1)`, ok: modEnergyMJ <= limits.moduleEnergyMJ, detail: `${modEnergyMJ.toFixed(2)} MJ` },
    ...(modCellMassKg === null ? [] : [{ label: `Cells per module ≤ ${limits.moduleMassKg} kg (EV.5.1.1, before housing and busbars)`, ok: modCellMassKg <= limits.moduleMassKg, detail: `${modCellMassKg.toFixed(2)} kg of cells` }]),
    { label: `Cell current at ${limits.maxPowerKw} kW within rating (nominal voltage)`, ok: cellAmps <= cell.aCont, detail: `${cellAmps.toFixed(1)} A of ${cell.aCont} A` },
    { label: `Cell current at ${limits.maxPowerKw} kW within rating (empty pack)`, ok: cellAmpsLow <= cell.aCont, detail: `${cellAmpsLow.toFixed(1)} A of ${cell.aCont} A` }
  ];
  return { cellsPerModule, vMax, vNom, vMin, energyWh, modVMax, modEnergyMJ, modCellMassKg, packAmpsAtLimit, cellAmps, cellAmpsLow, checks, cells: series * parallel };
}
