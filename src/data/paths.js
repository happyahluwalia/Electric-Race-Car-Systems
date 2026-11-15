// Guided learning paths. Each step points at something that already exists:
// a system overview, a part, a journey or a lab. Order is the teaching order.
// kind: 'system' | 'part' | 'journey' | 'lab'
export const paths = [
  {
    id: 'foundations',
    name: 'Foundations: how the car works',
    who: 'New to electric cars. No electronics background needed.',
    time: 'About 2 hours',
    steps: [
      { kind: 'system', id: 'hv', why: 'Where the energy lives and how it reaches the wheels.' },
      { kind: 'part', id: 'cell', why: 'Everything else in the pack exists to serve these.' },
      { kind: 'part', id: 'accumulator', why: 'Why the pack is split into modules and sealed in a container.' },
      { kind: 'part', id: 'air', why: 'The two switches that decide whether high voltage leaves the box.' },
      { kind: 'part', id: 'precharge', why: 'Why you cannot just close the relays.' },
      { kind: 'part', id: 'inverter', why: 'DC in, controlled three-phase current out.' },
      { kind: 'part', id: 'motor', why: 'Current becomes torque.' },
      { kind: 'journey', id: 'startup', why: 'Put the pieces in order: master switch to ready-to-drive.' },
      { kind: 'system', id: 'safety', why: 'What stops the car when something goes wrong.' },
      { kind: 'journey', id: 'pedal', why: 'Follow one press of the pedal through every system.' },
      { kind: 'lab', id: 'pack', why: 'Size a real pack against the 2027 limits.' }
    ]
  },
  {
    id: 'bmsfirmware',
    name: 'Battery firmware engineer',
    who: 'You can read C and a datasheet, and you are about to write a BMS driver.',
    time: 'About 3 hours',
    steps: [
      { kind: 'part', id: 'cell', why: 'The voltage and temperature window your firmware has to enforce.' },
      { kind: 'part', id: 'accumulator', why: 'Module limits set how many cells each monitor chip sees.' },
      { kind: 'part', id: 'cellmonitor', why: 'Chip choice, isolated links, and the eight-step driver walkthrough.' },
      { kind: 'lab', id: 'frame', why: 'Build a command frame and its PEC by hand.' },
      { kind: 'part', id: 'sensors', why: 'Thermistor placement and isolation rules.' },
      { kind: 'part', id: 'bms', why: 'What counts as a fault, latching, and task priorities.' },
      { kind: 'lab', id: 'bms', why: 'Inject stale data and open wires and watch the supervisor react.' },
      { kind: 'journey', id: 'cellfault', why: 'From one bad reading to an open pack.' },
      { kind: 'part', id: 'shutdown', why: 'Your fault output is one contact in this loop.' },
      { kind: 'part', id: 'packcurrent', why: 'Current sensing for state of charge and protection.' },
      { kind: 'lab', id: 'dbc', why: 'Read a production battery module\'s CAN messages, including multiplexed cell voltages.' }
    ]
  },
  {
    id: 'vehiclecontrol',
    name: 'Vehicle control and CAN',
    who: 'You will write VCU or inverter-interface firmware.',
    time: 'About 3 hours',
    steps: [
      { kind: 'part', id: 'apps', why: 'Two sensors, different curves, and the 100 ms rule.' },
      { kind: 'part', id: 'vcu', why: 'Microcontroller, RTOS and layering choices.' },
      { kind: 'lab', id: 'vcu', why: 'Every reason a torque request can be refused.' },
      { kind: 'part', id: 'can', why: 'Why CAN, how many buses, and what a DBC is for.' },
      { kind: 'part', id: 'cancontroller', why: 'Interrupt-to-queue and bus-off handling.' },
      { kind: 'lab', id: 'dbc', why: 'Decode signals bit by bit.' },
      { kind: 'part', id: 'inverter', why: 'The Cascadia driver walkthrough.' },
      { kind: 'lab', id: 'inverterframe', why: 'Build the 0x0C0 torque command and decode the broadcasts.' },
      { kind: 'lab', id: 'safetygate', why: 'How production firmware refuses bad torque commands, with real limits from comma.ai.' },
      { kind: 'lab', id: 'reverse', why: 'Find an undocumented signal the way opendbc contributors do.' },
      { kind: 'journey', id: 'pedal', why: 'The whole chain, end to end.' },
      { kind: 'lab', id: 'simulation', why: 'Inject faults and see which system reacts.' }
    ]
  }
];
export const pathById = Object.fromEntries(paths.map(p => [p.id, p]));

// "Read first": parts a newcomer should understand before this one.
export const prerequisites = {
  accumulator: ['cell'],
  hvfuse: ['accumulator'],
  air: ['accumulator'],
  contactorCoil: ['air'],
  precharge: ['air', 'dcLink'],
  dcLink: ['inverter'],
  gateDriver: ['inverter'],
  resolver: ['motor'],
  cellmonitor: ['cell', 'accumulator'],
  bms: ['cellmonitor'],
  packcurrent: ['bms'],
  apps: ['vcu'],
  imd: ['shutdown'],
  bspd: ['shutdown', 'apps'],
  tsal: ['air', 'shutdown'],
  cancontroller: ['can'],
  cantransceiver: ['can'],
  dcdc: ['lv'],
  sensors: ['cellmonitor']
};
