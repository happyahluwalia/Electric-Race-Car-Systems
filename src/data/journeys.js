// Journeys follow one cause-and-effect chain across several systems.
// Every step names the component where it happens.
export const journeys = [
  {
    id: 'startup',
    name: 'Switching the car on',
    blurb: 'From master switch to ready-to-drive.',
    sources: ['fsae2027'],
    steps: [
      { part: 'lv', title: 'Low voltage comes up', text: 'The low-voltage master switch powers the controllers. Every indicator lamp lights for 2 to 6 s as a lamp check. Nothing above 60 V exists outside the battery container yet, so the amber lights stay off and the status indicator shows green.' },
      { part: 'shutdown', title: 'The safety loop is closed', text: 'With every button out, the insulation monitor, battery monitor and brake plausibility device all healthy, and the tractive master switch on, the loop is complete.' },
      { part: 'precharge', title: 'Precharge', text: 'The negative relay and the precharge relay close. The inverter capacitors charge through the resistor until the measured bus voltage reaches at least 90% of pack voltage.' },
      { part: 'air', title: 'Main relay closes', text: 'The second isolation relay closes across a small voltage difference, and the precharge relay drops out. The pack is now connected.' },
      { part: 'tsal', title: 'Tractive system active', text: 'High voltage is now present outside the container. The amber Ready to Move Lights flash at about 1 Hz, driven by the measured voltage alone.' },
      { part: 'vcu', title: 'Ready to drive', text: 'The driver holds the brake and presses start. The control unit enters its drive state.' },
      { part: 'dashboard', title: 'Warning sound', text: 'As the car enters ready-to-drive it sounds a tone of at least 80 dBA for one to three seconds, so nobody nearby is surprised when it moves.' }
    ]
  },
  {
    id: 'pedal',
    name: 'Pedal to torque',
    blurb: 'How a foot movement becomes wheel torque.',
    sources: ['fsae2027'],
    steps: [
      { part: 'apps', title: 'Two sensors move', text: 'Pedal travel becomes two independent voltages with different curves.' },
      { part: 'vcu', title: 'Sample and check', text: 'The control unit samples both, rejects anything outside the valid range, and compares them. More than 10% apart for more than 100 ms cuts motor power.' },
      { part: 'vcu', title: 'Decide the torque', text: 'The state machine confirms the car is in its drive state. The request is limited by brake state, what the battery says it can deliver, and what the inverter reports.' },
      { part: 'cancontroller', title: 'Build the frame', text: 'A device driver encodes the torque request into the inverter\'s message format and hands it to the CAN controller.' },
      { part: 'cantransceiver', title: 'Onto the wire', text: 'The transceiver drives the two bus wires apart for each dominant bit.' },
      { part: 'can', title: 'Across the bus', text: 'Every node sees the frame. The inverter\'s filter accepts it and acknowledges.' },
      { part: 'inverter', title: 'Current control', text: 'The inverter checks the command is fresh, then regulates phase current to produce that torque.' },
      { part: 'gateDriver', title: 'Switching', text: 'Gate drivers turn the six power switches on and off thousands of times a second.' },
      { part: 'motor', title: 'Torque', text: 'Phase current in the stator pulls the rotor round. The shaft drives the wheels.' }
    ]
  },
  {
    id: 'cellfault',
    name: 'A cell goes over-voltage',
    blurb: 'From one bad reading to a disconnected pack.',
    sources: ['fsae2027', 'vmsBms'],
    steps: [
      { part: 'cell', title: 'A cell drifts high', text: 'During regeneration or charging, one cell rises above its limit.' },
      { part: 'cellmonitor', title: 'Measured', text: 'The monitor IC on that module converts the cell voltage and sends it down the isolated link with an error check.' },
      { part: 'bms', title: 'Validated', text: 'The BMS confirms the error check and that the reading is fresh, then compares it to the limit.' },
      { part: 'bms', title: 'Latched', text: 'The fault is latched. It will not clear by itself even if the voltage recovers.' },
      { part: 'shutdown', title: 'Loop opened', text: 'The BMS safety output opens its contact in the shutdown loop.' },
      { part: 'air', title: 'Pack disconnected', text: 'Coil power is gone, so both isolation relays spring open.' },
      { part: 'dcLink', title: 'Bus discharged', text: 'The discharge circuit bleeds the capacitors. Within five seconds the bus is below 60 V.' },
      { part: 'can', title: 'Reported', text: 'In parallel, a fault frame tells the control unit and the logger what happened.' }
    ]
  },
  {
    id: 'isolation',
    name: 'An insulation fault',
    blurb: 'Why the car stops when a cable chafes through.',
    sources: ['fsae2027', 'ir155'],
    steps: [
      { part: 'imd', title: 'Resistance falls', text: 'A damaged cable gives the high-voltage system a path to the chassis. The monitor measures insulation resistance below its threshold.' },
      { part: 'shutdown', title: 'Loop opened and latched', text: 'The monitor\'s output trips a hardware latch in the shutdown loop. No software is involved.' },
      { part: 'air', title: 'Pack disconnected', text: 'Both isolation relays open.' },
      { part: 'tsal', title: 'Lights change', text: 'The status indicator switches from green to flashing red the moment the IMD latch trips. Once the bus has discharged below 50 V the amber Ready to Move Lights go off.' },
      { part: 'dashboard', title: 'Driver told', text: 'The red IMD lamp lights in the cockpit and stays on. The car stays disabled until a person resets it at the vehicle; the driver cannot.' }
    ]
  }
];
export const journeyById = Object.fromEntries(journeys.map(j => [j.id, j]));
