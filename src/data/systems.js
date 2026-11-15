// The eight "body systems" of the car. `parts` is the suggested learning order.
export const systems = [
  {
    id: 'hv',
    context: [],
    name: 'High-voltage energy path',
    short: 'HV energy',
    color: '#f0a44b',
    question: 'How does energy get from the cells to the wheels?',
    intro: 'Follow the thick orange cables. Energy leaves the cells, passes a fuse and two isolation relays, charges the inverter\'s capacitor bank gently through a precharge resistor, and is then switched into three-phase current for the motor.',
    ideas: [
      'Everything on this path is above 60 V DC, which the rules define as High Voltage. The whole path floats: neither side is connected to the chassis.',
      'Voltage is set by cells in series, current capability by cells in parallel. The rules cap the system at 600 V DC and 80 kW.',
      'The pack can never be switched straight onto the inverter. The capacitor bank looks like a short circuit until it is precharged.'
    ],
    parts: ['cell', 'accumulator', 'hvfuse', 'air', 'precharge', 'dcLink', 'inverter', 'motor'],
    labs: ['pack', 'precharge', 'powertrain'],
    sources: ['fsae2027']
  },
  {
    id: 'bms',
    context: ['accumulator'],
    name: 'Battery management',
    short: 'Battery mgmt',
    color: '#4fcf9f',
    question: 'How does the car know every cell is safe?',
    intro: 'Monitor chips sit on each battery module and measure every cell voltage and a share of the temperatures. They pass the readings along an isolated two-wire link to one microcontroller, which decides whether the pack may keep running.',
    ideas: [
      'Measuring, deciding and acting are three separate jobs: monitor IC, BMS firmware, shutdown output.',
      'A reading only counts if it is fresh and passed its error check. Missing data is treated as a fault, never as "probably fine".',
      'The 2027 rules call it the BMS; older editions said Accumulator Management System (AMS). It must be able to open the shutdown circuit by itself, and a missing measurement counts as a fault.'
    ],
    parts: ['cell', 'cellmonitor', 'bms', 'packcurrent'],
    labs: ['frame', 'bms', 'pack'],
    sources: ['fsae2027', 'vmsBms']
  },
  {
    id: 'powertrain',
    context: [],
    name: 'Inverter and motor',
    short: 'Powertrain',
    color: '#a88cf5',
    question: 'How does DC become controlled torque?',
    intro: 'Six power switches chop the DC bus into three-phase current thousands of times a second. A control loop measures phase current and rotor angle and adjusts the switching so the motor produces exactly the torque that was requested.',
    ideas: [
      'The inverter is both a power converter and a real-time controller.',
      'Torque is proportional to phase current; speed is limited by the DC voltage available.',
      'Gate drivers are the bridge between 3.3 V logic and switches sitting hundreds of volts away.'
    ],
    parts: ['dcLink', 'gateDriver', 'inverter', 'resolver', 'motor'],
    labs: ['powertrain', 'assemblies'],
    sources: []
  },
  {
    id: 'control',
    context: ['inverter'],
    name: 'Vehicle control',
    short: 'Control',
    color: '#5fa9f5',
    question: 'How does a pedal press become a torque request?',
    intro: 'Two independent pedal sensors are read by the vehicle control unit. It checks that they agree, checks the brake, checks the battery and inverter are ready, and only then sends a torque request to the inverter.',
    ideas: [
      'Driver intent is never trusted from a single sensor.',
      'The VCU is a state machine first and a torque calculator second.',
      'Most of the firmware exists to decide when not to produce torque.'
    ],
    parts: ['apps', 'sensors', 'vcu', 'dashboard'],
    labs: ['vcu', 'simulation', 'pinout'],
    sources: ['fsae2027', 'evEcu']
  },
  {
    id: 'comms',
    context: ['accumulator', 'vcu', 'bms', 'inverter'],
    name: 'Communication buses',
    short: 'Comms',
    color: '#c58af0',
    question: 'How do the boxes talk to each other?',
    intro: 'Controllers share one or more CAN buses: a twisted pair that every node can talk on. Inside the battery a different link, isoSPI, carries data between boards that sit at different voltages.',
    ideas: [
      'A CAN node is three layers: the controller inside the MCU, a transceiver chip, and the wire.',
      'A CAN identifier says nothing about the bytes inside. That mapping lives in a DBC file.',
      'Each link is chosen for its job: CAN for robustness between boxes, SPI on a board, isoSPI across an isolation barrier.'
    ],
    parts: ['cancontroller', 'cantransceiver', 'can', 'cellmonitor', 'dashboard'],
    labs: ['dbc', 'can', 'frame'],
    sources: ['sloa101']
  },
  {
    id: 'safety',
    context: ['accumulator', 'vcu'],
    name: 'Shutdown and safety',
    short: 'Safety',
    color: '#ef6f76',
    question: 'What stops the car when something goes wrong?',
    intro: 'One hardwired loop of switches and relay contacts feeds the coils of the isolation relays. If anything in the loop opens, the coils lose power and the battery disconnects. No software sits in that path.',
    ideas: [
      'The shutdown circuit is a wire, not a message. CAN only reports what happened.',
      'Three independent watchers can open it: the battery management system (BMS), the insulation monitor (IMD) and the brake plausibility device (BSPD).',
      'After one of those three trips, only a person at the car can reset it.'
    ],
    parts: ['shutdown', 'imd', 'bspd', 'contactorCoil', 'air', 'tsal'],
    labs: ['simulation'],
    sources: ['fsae2027']
  },
  {
    id: 'lv',
    context: ['vcu', 'bms', 'dashboard', 'cooling', 'contactorCoil'],
    name: 'Low-voltage power',
    short: 'LV power',
    color: '#52b9cc',
    question: 'What powers the electronics?',
    intro: 'A small battery feeds fused branches to every controller, sensor, pump and relay coil. Some cars add an isolated DC/DC converter that tops this up from the main pack once the high voltage is on.',
    ideas: [
      'Every other system depends on this one. A sagging supply shows up as faults everywhere else.',
      'The low-voltage side is grounded to the chassis; the high-voltage side is not. They must stay galvanically separate.',
      'The relay coils that hold the battery connected are low-voltage loads.'
    ],
    parts: ['lv', 'dcdc'],
    labs: ['pinout'],
    sources: ['fsae2027']
  },
  {
    id: 'thermal',
    context: ['motor', 'inverter', 'accumulator'],
    name: 'Cooling',
    short: 'Cooling',
    color: '#63cbd0',
    question: 'Where does the waste heat go?',
    intro: 'Losses in the cells, inverter and motor become heat. A pump moves coolant through the hot parts to a radiator, and temperature sensors tell the controllers when to cut power.',
    ideas: [
      'A few percent of 80 kW is still kilowatts of heat.',
      'Temperature limits are enforced in firmware by reducing torque before anything is damaged.',
      'Cell temperature has a hard rules limit of 60 °C.'
    ],
    parts: ['cooling', 'sensors'],
    labs: ['powertrain'],
    sources: ['fsae2027']
  }
];

export const systemById = Object.fromEntries(systems.map(s => [s.id, s]));
