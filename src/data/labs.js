// Lab catalogue. Kept free of React imports so tests can read it.
export const labs = [
  { id: 'pack', name: 'Pack sizing', blurb: 'Choose series, parallel and segment counts and check them against the rule limits.', group: 'Battery' },
  { id: 'frame', name: 'Cell-monitor frame builder', blurb: 'Build a command frame with its error check and decode a voltage register, as a BMS driver does.', group: 'Battery' },
  { id: 'bms', name: 'BMS measurement chain', blurb: 'Inject stale data, failed error checks and open wires and see how the supervisor responds.', group: 'Battery' },
  { id: 'precharge', name: 'Precharge and power calculators', blurb: 'RC precharge curve and torque × speed, plus three diagnosis questions.', group: 'High voltage' },
  { id: 'powertrain', name: 'Inverter and motor envelope', blurb: 'Move the operating point around a torque-speed curve with thermal derating.', group: 'High voltage' },
  { id: 'assemblies', name: 'Look inside', blurb: 'Exploded 3D views of the accumulator, inverter and motor.', group: 'High voltage' },
  { id: 'vcu', name: 'VCU firmware pipeline', blurb: 'From ADC sample to torque command, with every reason torque can be refused.', group: 'Control' },
  { id: 'simulation', name: 'Whole-car fault simulator', blurb: 'Drive the pedal, inject faults, and watch what each system does.', group: 'Control' },
  { id: 'pinout', name: 'A real ECU connector', blurb: 'All 48 pins of an open-source Formula SAE ECU.', group: 'Control' },
  { id: 'dbc', name: 'DBC decoder', blurb: 'Paste a DBC, type raw bytes, and decode signals bit by bit.', group: 'Communication' },
  { id: 'can', name: 'CAN identifiers from a real car', blurb: 'Why an identifier alone tells you nothing about the payload.', group: 'Communication' },
  { id: 'nets', name: 'Interface map', blurb: 'What crosses each boundary between subsystems.', group: 'Communication' }
];
export const labIds = labs.map(l => l.id);
export const labById = Object.fromEntries(labs.map(l => [l.id, l]));
