import { components as base } from './base.js';
import { enrich, added } from './enrich.js';
import { systems } from './systems.js';

// Short labels used on the 3D model, where full names would collide.
const labels = {
  cell: 'Cell', accumulator: 'Tractive battery', hvfuse: 'HV fuse', air: 'Isolation relays', contactorCoil: 'Relay coil + feedback',
  precharge: 'Precharge', dcLink: 'DC-link capacitors', inverter: 'Inverter', gateDriver: 'Gate drivers', motor: 'Motor',
  resolver: 'Rotor position sensor', cellmonitor: 'Cell monitors', bms: 'BMS master', packcurrent: 'Current sensor',
  vcu: 'VCU', apps: 'Pedal sensors', sensors: 'Sensors', dashboard: 'Dashboard', can: 'CAN bus',
  cancontroller: 'CAN controller', cantransceiver: 'CAN transceiver', shutdown: 'Shutdown circuit', imd: 'IMD',
  bspd: 'BSPD', tsal: 'Status lights', lv: 'LV battery + fuses', dcdc: 'DC/DC converter', cooling: 'Cooling'
};

export const components = [...added, ...base].map(c => ({
  rules: [], decisions: [], cases: [], labs: [],
  ...c,
  ...(enrich[c.id] || {}),
  label: labels[c.id] || c.name,
  systems: systems.filter(s => s.parts.includes(c.id)).map(s => s.id)
}));

export const componentById = Object.fromEntries(components.map(c => [c.id, c]));
