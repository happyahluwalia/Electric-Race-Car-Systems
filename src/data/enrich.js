// Per-component learning content layered on top of data/base.js.
//
// rules:     requirements quoted from a specific rules edition (always carries a source id)
// decisions: a design question, the realistic options, and what tips the choice.
//            `sources` lists the registry ids that back any numbers or part names.
//            `principle: true` marks general engineering reasoning with no part-specific figures.
// cases:     what a named team actually did (always carries a source id)
// firmware:  driver-level walkthrough
// labs:      ids of hands-on labs that exercise this component
// inside:    which exploded assembly shows the internals

// Rule ids and wording follow Formula SAE Rules 2027 V1.0 (1 Sept 2026). Older
// editions numbered the same requirements differently and used older names:
// Accumulator -> Tractive Battery, Segment -> Module, AMS -> BMS, AIR -> Isolation Relay.
const R = (id, text) => ({ id, text, source: 'fsae2027' });

export const enrich = {
  cell: {
    plain: 'One battery cell. Everything else in the pack exists to connect, protect or measure these.',
    rules: [
      R('EV.3.3.2', 'Maximum voltage between any two points: 600 V DC.'),
      R('EV.8.5.2', 'Cell temperature, allowing for measurement accuracy, must stay below the lower of the datasheet maximum and 60 °C.'),
      R('EV.8.4.2', 'Cell voltages must stay between the datasheet minimum and maximum, allowing for measurement accuracy.')
    ],
    decisions: [
      {
        q: 'Which chemistry?',
        options: [
          { name: 'NMC / NCA ("INR" power cells)', pros: 'High energy and high power for the mass. About 3.6 V nominal, so fewer cells in series for a given voltage.', cons: 'Smaller thermal safety margin than LFP. Needs tight voltage and temperature supervision.' },
          { name: 'LFP (lithium iron phosphate)', pros: 'More thermally stable, long cycle life.', cons: 'Lower cell voltage and lower energy per kilogram, so the pack is heavier. The flat voltage curve makes it harder to estimate state of charge from voltage.' },
          { name: 'High-rate LiPo pouch (LCO-based)', pros: 'Very high discharge current for the mass.', cons: 'Shorter life, swells and needs compression, least tolerant of abuse.' }
        ],
        takeaway: 'A race car is scored on lap time over short events, so mass and peak power matter more than cycle life. That pushes most teams to high-power NMC/NCA cylindrical cells or LiPo pouches. Road cars and stationary storage weigh life and abuse tolerance more heavily, which is where LFP wins.',
        example: 'A typical power cell: the Molicel INR-21700-P45B stores 4.5 Ah at 3.6 V nominal, charges to 4.2 V, must not go below 2.5 V and is rated for 45 A continuous.',
        sources: ['p45b']
      },
      {
        q: 'Which shape?',
        options: [
          { name: 'Cylindrical (18650, 21700)', pros: 'Rigid steel can, consistent from cell to cell, easy to buy in small quantities.', cons: 'Many small cells means many welds and more wasted space between them.' },
          { name: 'Pouch', pros: 'Packs tightly, wide tabs carry high current.', cons: 'Needs external compression and mechanical protection. Tab joints are harder to make well.' },
          { name: 'Prismatic', pros: 'Robust case, large capacity per cell, few connections.', cons: 'Heavier per unit of energy and usually lower power density.' }
        ],
        takeaway: 'The choice is as much about what the team can build reliably as about the cell: spot-welding hundreds of cylinders versus clamping and joining pouch tabs. Production cars have moved the other way: a survey of 25 BEVs from 2010 to 2019 found a trend to larger and prismatic cells, which suit automated assembly and few connections rather than a student workshop.',
        sources: ['lobberding2020', 'p45b']
      },
      {
        q: 'How many in series and in parallel?',
        options: [
          { name: 'More in series', pros: 'Higher voltage, so less current (and thinner cable, less heat) for the same power.', cons: 'More cell voltages to monitor. Capped by the 600 V limit and by the voltage rating of the inverter and motor.' },
          { name: 'More in parallel', pros: 'More current capability and more energy at the same voltage.', cons: 'More mass. Parallel groups share one voltage measurement, so one weak cell is harder to spot.' }
        ],
        takeaway: 'Start from the rules: 600 V maximum, 80 kW maximum, and each module at most 120 V, 6 MJ and 12 kg. With a 4.2 V cell the most you can put in series is 142 (596 V). At 80 kW and that pack\'s 511 V nominal the cells must deliver about 156 A, which needs four 45 A cells in parallel. Try it in the pack sizing lab.',
        sources: ['fsae2027', 'p45b']
      },
      {
        q: 'How hard can you push one cell?',
        options: [
          { name: 'Run near the continuous rating', pros: 'Fewest cells in parallel, so the lightest pack.', cons: 'Heat is I²R: at 45 A a P45B with about 15 mΩ DC resistance makes roughly 30 W, and the data sheet quotes that rating with an 80 °C cut-off, well above the 60 °C rule limit.' },
          { name: 'Leave margin (more cells in parallel)', pros: 'Current per cell falls, heat falls with its square, and the voltage sags less under load.', cons: 'More mass and cost, and more parallel groups to fuse.' }
        ],
        takeaway: 'A cell\'s headline current rating is a thermal limit tied to a test condition, not a promise for a sealed pack that must stay under 60 °C. Halving the current per cell quarters its heat. Charging has its own window: the P45B may be discharged from −40 °C but charged only between 0 and 60 °C, which the BMS has to enforce during charging.',
        sources: ['p45b', 'fsae2027']
      }
    ],
    labs: ['pack'],
    inside: 'battery'
  },

  accumulator: {
    plain: 'The battery pack, called the tractive battery in the rules (older editions said accumulator): cells grouped into modules inside one sealed, removable container.',
    rules: [
      R('EV.5.1.1', 'Each module: at most 120 V DC static voltage, 6 MJ of energy (maximum stack voltage × nominal cell capacity) and 12 kg of mass.'),
      R('EV.5.4.1', 'Each tractive battery pack needs at least one fuse and two or more isolation relays.'),
      R('EV.4.3.1', 'The container must be removable while staying rules-compliant, and completely closed at all times, on or off the car.')
    ],
    decisions: [
      {
        q: 'Why split the pack into modules?',
        options: [
          { name: 'One continuous string', pros: 'Fewest connectors.', cons: 'Anyone working on it is exposed to full pack voltage. Not permitted.' },
          { name: 'Several modules with maintenance plugs', pros: 'With the plugs out, no part of the open pack exceeds 120 V, and the 12 kg cap keeps each module liftable. One module can be swapped without rebuilding the pack.', cons: 'More connectors, each one a resistance and a possible failure point.' }
        ],
        takeaway: 'Splitting the pack is a safety and serviceability decision. It also sets how many cells each monitor board has to measure, which feeds straight into the choice of monitor IC. Older rulebooks and most team write-ups call a module a "segment".',
        sources: ['fsae2027']
      },
      {
        q: 'How is the pack cooled?',
        options: [
          { name: 'Forced air', pros: 'Light and simple, nothing to leak.', cons: 'Limited heat removal. Cells in the middle run hotter than those at the edge.' },
          { name: 'Liquid cold plate', pros: 'More heat removed and more even cell temperatures.', cons: 'Mass, pumps, hoses, and coolant next to high voltage.' }
        ],
        takeaway: 'The hard limit is 60 °C on any cell, measured at the negative terminal. Many race packs get there with air and enough thermal mass for a short run; liquid buys margin at the cost of mass and complexity.',
        sources: ['fsae2027']
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'Six segments (modules, in 2027 terms) of twelve Energus Li2x8pVTC5AT cell modules, arranged to be "easily removable and serviceable".', source: 'columbiaEv21' },
      { team: 'Virginia Motorsports', text: '144 cells in eight segments (modules) of eighteen, with six thermistors per segment.', source: 'vmsBms' }
    ],
    labs: ['pack', 'assemblies'],
    inside: 'battery'
  },

  hvfuse: {
    plain: 'A one-shot safety link that melts if a short circuit drives far too much current.',
    rules: [
      R('EV.7.6.2', 'Rated for DC at or above the system voltage, a continuous rating no higher than the part it protects, and an interrupt rating above the theoretical short-circuit current.'),
      R('EV.5.4.1', 'At least one fuse per tractive battery pack.'),
      R('EV.7.6.3', 'Every parallel element (parallel cells, strings or conductors) needs its own overcurrent protection.')
    ],
    decisions: [
      {
        q: 'The pack already has relays and a BMS. Why a fuse as well?',
        options: [
          { name: 'Rely on the relays', pros: 'No extra part.', cons: 'A relay is built to break load current. A dead short can be many times that, enough to weld the contacts shut.' },
          { name: 'Rely on the BMS', pros: 'Can react to slow overloads.', cons: 'Needs working sensors, software and power. Too slow and too complex to be the last line of defence.' },
          { name: 'Fuse', pros: 'Passive: no supply, no code, nothing to configure. Clears faults larger than a relay can break.', cons: 'Single use. Must be chosen for DC: the voltage and interrupt ratings matter as much as the amps.' }
        ],
        takeaway: 'The three protect against different things: BMS for slow problems, relays for commanded disconnection, fuse for the short circuit nothing else survives.',
        sources: ['fsae2027']
      }
    ]
  },

  air: {
    plain: 'Two heavy-duty switches, one on each battery terminal, that connect the pack to the car only while the safety loop is healthy. The rules call them isolation relays (IR); older editions said AIR.',
    rules: [
      R('EV.5.4.1', 'Two or more isolation relays per tractive battery pack.'),
      R('EV.5.4.2', 'Normally open, and they must open both poles.'),
      R('EV.5.4.3', 'With the relays open, no high voltage may exist outside the container, and each relay must give complete galvanic isolation between its two sides.'),
      R('EV.8.2.2', 'When the shutdown circuit opens: battery current stops immediately, and tractive voltage falls to Low Voltage within 5 seconds.')
    ],
    decisions: [
      {
        q: 'What kind of switch can break hundreds of volts DC?',
        options: [
          { name: 'Sealed DC contactor', pros: 'Built to stretch and extinguish a DC arc inside a sealed chamber.', cons: 'Large, costly, and the coil draws continuous low-voltage power.' },
          { name: 'Ordinary AC-rated relay', pros: 'Cheap and small.', cons: 'AC arcs die at each zero crossing. DC has no zero crossing, so the arc can sustain and destroy the relay.' },
          { name: 'Semiconductor switch', pros: 'No arc, very fast.', cons: 'No physical air gap when off, conducts heat while on, and tends to fail short.' }
        ],
        takeaway: 'Breaking DC is the hard part. A contactor rated for the full pack voltage and fault current is the only option that also leaves a real gap in the circuit. The TE EV200, common in student cars, is rated 12 to 900 V DC, carries 500 A and can interrupt 2000 A at 320 V DC once; its sealed contact chamber is what makes that possible, and a coil economiser cuts hold power to 1.7 W at 12 V.',
        sources: ['ev200']
      },
      {
        q: 'Why one on each terminal instead of just one?',
        options: [
          { name: 'One relay', pros: 'Half the parts and half the coil power.', cons: 'If its contacts weld, the pack stays connected. The other pole is always live outside the container.' },
          { name: 'One per pole', pros: 'A single welded contact still leaves the circuit open. With both open, nothing outside the container is connected to the cells.', cons: 'More mass and cost.' }
        ],
        takeaway: 'Normally-open matters just as much: lose low-voltage power for any reason and the springs open the contacts.',
        sources: ['fsae2027']
      }
    ],
    labs: ['precharge', 'simulation']
  },

  contactorCoil: {
    plain: 'The low-voltage electromagnet that holds each isolation relay closed, and the feedback that tells you whether it really moved.',
    rules: [
      R('EV.5.4.5', 'A capacitor may hold the relays closed for at most 250 ms after the shutdown circuit opens.')
    ],
    decisions: [
      {
        q: 'How do you know a contactor actually opened?',
        options: [
          { name: 'Trust the command', pros: 'Nothing to add.', cons: 'A welded contact looks exactly like a healthy one.' },
          { name: 'Auxiliary contact', pros: 'A small extra switch moves with the mechanism and gives a direct logic signal.', cons: 'Shows the mechanism moved, not that the main contacts are clean.' },
          { name: 'Measure voltage on both sides', pros: 'Shows what the high-voltage circuit is really doing.', cons: 'Needs isolated voltage sensing and time for the capacitors to discharge.' }
        ],
        takeaway: 'Good designs keep four things separate: the command, the coil current, the auxiliary contact, and the measured bus voltage. Disagreement between any two is a fault worth reporting. The EV200\'s optional auxiliary contact is sold for exactly this, "monitoring of power contact position".',
        sources: ['ev200']
      }
    ]
  },

  precharge: {
    plain: 'A resistor and small relay that fill the inverter\'s capacitors slowly before the main relays close.',
    rules: [
      R('EV.5.6.1', 'Charge the intermediate circuit to at least 90% of tractive system voltage before closing the second isolation relay, supplied from the shutdown circuit.'),
      R('EV.5.6.2', 'The end of precharge must be controlled by feedback from the measured intermediate-circuit voltage.'),
      R('EV.5.6.4', 'PTC devices must not be used to limit precharge or discharge current.'),
      R('EV.5.6.5', 'The precharge relay must be a mechanical type.')
    ],
    decisions: [
      {
        q: 'What resistance?',
        options: [
          { name: 'Low resistance', pros: 'Fast start-up.', cons: 'High peak current at the first instant (pack voltage ÷ R) and a large pulse of heat in the resistor.' },
          { name: 'High resistance', pros: 'Gentle on the resistor and relay.', cons: 'Slow. If anything on the bus draws current, the voltage may never reach 90%.' }
        ],
        takeaway: 'The voltage rises as 1 − e^(−t/RC). Reaching 90% takes about 2.3 time constants. The resistor absorbs the same energy the capacitors end up storing (½CV²) whatever its value, so it is sized for that energy pulse, not for continuous power. A self-limiting PTC resistor is not allowed for this job.',
        sources: ['fsae2027']
      },
      {
        q: 'How do you decide precharge has finished?',
        options: [
          { name: 'Fixed timer', pros: 'No high-voltage measurement needed.', cons: 'Blind. A broken resistor or a shorted bus looks the same as success. Not permitted on its own since the 2027 rules.' },
          { name: 'Voltage feedback', pros: 'Closes the main relay only when the bus has really reached the threshold, and can raise a timeout fault if it never does.', cons: 'Needs isolated measurement of bus voltage.' }
        ],
        takeaway: 'Earlier rule editions allowed a timer; the 2027 rules require voltage feedback. Feedback turns precharge from a delay into a check, which is why most inverters and BMS units report bus voltage. Keep the timer as well, as a timeout that raises a fault.',
        sources: ['fsae2027']
      }
    ],
    labs: ['precharge']
  },

  dcLink: {
    plain: 'A bank of capacitors right at the inverter that supplies the fast current pulses the switches demand.',
    rules: [
      R('EV.8.2.2', 'After shutdown, tractive voltage must fall to Low Voltage within 5 seconds, so this bank needs a discharge path.'),
      R('EV.5.6.3', 'The discharge circuit must be active whenever the shutdown circuit is open, work with the service disconnect removed, carry no fuse, and withstand full tractive voltage for at least 15 seconds.')
    ],
    decisions: [
      {
        q: 'Film or electrolytic capacitors?',
        options: [
          { name: 'Film', pros: 'Low internal resistance, handles high ripple current, long life.', cons: 'Less capacitance for the volume.' },
          { name: 'Aluminium electrolytic', pros: 'A lot of capacitance in a small, cheap can.', cons: 'Higher internal resistance means more heating. Life falls quickly with temperature. Individual cans are rated below typical traction voltages, so they must be stacked in series and balanced.' }
        ],
        takeaway: 'Traction inverters overwhelmingly use film capacitors. The job is carrying ripple current, not storing energy, and film does that with less heat: one manufacturer\'s guide credits film with about three times the ripple current capability and twice the voltage rating, which removes series stacks and balancing resistors, plus dry construction that cannot vent electrolyte.',
        sources: ['cdeFilm']
      }
    ],
    inside: 'inverter',
    labs: ['precharge']
  },

  inverter: {
    plain: 'The motor controller. It turns battery DC into three-phase current and controls how much torque the motor makes.',
    rules: [
      R('EV.3.3.1', 'Power measured by the energy meter must not exceed 80 kW.'),
      R('EV.4.2', 'Motors must connect to the battery only through a motor controller.'),
      R('EV.8.2.2', 'When the shutdown circuit opens the motors must spin free with no torque applied.'),
      R('EV.3.1.3', 'Any torque algorithm may only reduce the driver\'s requested torque, never increase it.')
    ],
    decisions: [
      {
        q: 'Buy an inverter or design one?',
        options: [
          { name: 'Commercial unit', pros: 'Proven power stage and protection, documented CAN interface, support.', cons: 'Cost and mass. You work within its limits and its message set.' },
          { name: 'Team-built', pros: 'Sized exactly for the car. Enormous learning value.', cons: 'Power electronics fail destructively. A long, expensive road to something reliable.' }
        ],
        takeaway: 'Most teams buy the inverter and put their engineering effort into the control unit, battery and integration. All three team projects in this app\'s case studies use a Cascadia Motion unit.',
        sources: ['columbiaEv21', 'evEcu', 'uscVcu']
      },
      {
        q: 'Silicon IGBT or silicon-carbide MOSFET switches?',
        options: [
          { name: 'Silicon IGBT', pros: 'Mature, rugged, lower cost.', cons: 'Loses more energy every time it switches, which limits switching frequency and adds heat.' },
          { name: 'Silicon-carbide MOSFET', pros: 'Much lower switching loss: higher efficiency, smaller cooling system.', cons: 'More expensive. Very fast voltage edges demand careful gate drive, layout and noise control.' }
        ],
        takeaway: 'Silicon carbide is the direction of travel for new designs; IGBT units remain common because they are proven and affordable. One vendor benchmark of a 25 kW inverter at 8 kHz put a 30 A SiC module against a 100 A IGBT module and reported a 77% smaller heat sink and about 1.1% higher efficiency, with the SiC part costing more up front.',
        sources: ['wolfspeedSic']
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'Cascadia Motion PM100DX, chosen for its "reliability".', source: 'columbiaEv21' },
      { team: 'lflaherty/ev-ecu', text: 'The first CAN bus on the ECU connector is reserved for an inverter using the Cascadia Motion protocol, and one 24 V power output channel switches the inverter\'s low-voltage supply.', source: 'evEcu' },
      { team: 'USC', text: 'The motor controller task sends a free-roll command (all zeros) whenever the car is not in drive, a pedal check has failed, or the inverter\'s fault status is older than 250 ms or non-zero.', source: 'uscVcu' }
    ],
    firmware: {
      intro: 'What a VCU driver for a Cascadia Motion inverter does, as implemented in two public Formula SAE firmwares. Both talk to the same message set: the inverter broadcasts its state on identifiers 0x0A0 to 0x0AD and listens for one command on 0x0C0. Confirm every layout against the manufacturer\'s protocol document for your firmware version.',
      steps: [
        { title: '1. Filter in the broadcast set', body: 'Register a hardware filter for the inverter\'s identifier range and push accepted frames onto a queue. The driver rejects any frame whose length is not 8 before it touches the payload.', sources: ['evEcu'] },
        { title: '2. Decode with the right scale', body: 'Fields are little-endian 16-bit values. Temperatures (0x0A0 to 0x0A2), currents (0x0A6), voltages (0x0A7), motor angle and electrical frequency (0x0A5) and torque (0x0AC) are all in tenths; flux is in thousandths of a weber; speed is a plain signed rpm. Phase currents are signed, temperatures unsigned.', code: 'temperature_C = u16 / 10      current_A = i16 / 10\nvoltage_V     = u16 / 10      torque_Nm = u16 / 10\nflux_Wb       = u16 / 1000    speed_rpm = (int16_t) u16', sources: ['evEcu'] },
        { title: '3. Treat 0x0AB as the verdict', body: 'The fault frame carries two 32-bit one-hot words: power-on self-test faults and run faults. USC keeps a timestamped snapshot of the last one; the status counts as safe only if it is younger than 250 ms and both words are zero. ev-ecu maps an inverter CAN timeout to its own fault code 0x00000001 and an inverter fault message to 0x00800000.', sources: ['uscVcu', 'evEcu'] },
        { title: '4. Build the 0x0C0 command', body: 'Eight bytes: signed torque in 0.1 Nm, signed speed (unused in torque mode), a direction byte, a flag byte (bit 0 enable, bit 1 discharge, bit 2 speed mode) and a torque limit in 0.1 Nm where 0 means "use the limits stored in the inverter". Try it in the inverter CAN lab.', code: '12.5 Nm forward, enabled:\n7D 00 | 00 00 | 01 | 01 | 00 00\ntorque  speed  dir  flags  limit', sources: ['evEcu'] },
        { title: '5. Clear the enable lockout', body: 'After power-up the inverter refuses to enable until it has seen a disable command. ev-ecu therefore sends a frame with torque 0 and enable 0 immediately before the first enable; its own state machine must have called enable before any torque command is accepted.', sources: ['evEcu'] },
        { title: '6. Never go quiet', body: 'USC re-sends the command at least every 100 ms even when the value is unchanged, limits how fast the torque request may rise per cycle, and publishes an all-zero free-roll command instead of nothing whenever torque is not allowed. The inverter treats a missing command the way a good driver treats a missing status: as a fault.', sources: ['uscVcu'] },
        { title: '7. Keep discharge and enable apart', body: 'Discharge mode bleeds the DC-link capacitors through the inverter. ev-ecu refuses to enter it while the inverter is enabled and clears the enabled flag when it does, because torque output and active discharge are mutually exclusive.', sources: ['evEcu'] },
        { title: '8. Cut the supply as the last resort', body: 'If the controller itself is in doubt (hard fault, watchdog, brown-out) ev-ecu\'s special fault handler switches off the inverter\'s power channel and asserts the shutdown output by writing to the hardware directly, bypassing every driver layer.', sources: ['evEcu'] }
      ]
    },
    labs: ['powertrain', 'assemblies', 'inverterframe'],
    inside: 'inverter'
  },

  gateDriver: {
    plain: 'The circuit that turns a 3.3 V logic signal into the push needed to switch a power transistor sitting hundreds of volts away.',
    decisions: [
      {
        q: 'Why an isolated driver with built-in protection?',
        options: [
          { name: 'Bootstrap (non-isolated) driver', pros: 'Cheap and compact. Fine for low-voltage motor drives.', cons: 'Logic and power share a ground. No barrier if the power stage fails.' },
          { name: 'Isolated driver with desaturation detection', pros: 'A barrier between control and power. Detects a short through the switch and turns it off within microseconds, before the controller could react.', cons: 'Each switch needs its own isolated supply. More parts.' }
        ],
        takeaway: 'At traction voltages the driver is a safety component. Two things it must guarantee: the upper and lower switch of a leg are never on together (dead time), and a shorted switch is shut down faster than software could manage. A representative part, TI\'s UCC21750, gives 5.7 kVrms isolation, desaturation detection with a 200 ns response and a soft turn-off, plus a Miller clamp and undervoltage lockout.',
        sources: ['ucc21750']
      }
    ],
    inside: 'inverter'
  },

  motor: {
    plain: 'Turns three-phase current into shaft torque.',
    decisions: [
      {
        q: 'Which type of motor?',
        options: [
          { name: 'Permanent-magnet synchronous', pros: 'Highest torque and efficiency for the mass.', cons: 'Needs rotor angle. Generates voltage whenever it spins, even with the inverter off. Magnets weaken if overheated.' },
          { name: 'Induction', pros: 'Rugged, no magnets, produces no voltage when unpowered.', cons: 'Lower torque for the mass, and the rotor itself heats up.' }
        ],
        takeaway: 'Mass decides it for a race car: permanent-magnet machines dominate. A comparative study finds interior-PM machines have higher power factor and efficiency than induction machines, with the caveat that magnet demagnetisation limits their overload torque. The EMRAX 208 used by Columbia is a 9.4 to 10.3 kg axial-flux PM motor with an 86 kW peak. The fact that a spinning magnet motor is a generator is something the rest of the high-voltage system has to be designed around.',
        sources: ['gundogdu2022', 'emrax208']
      },
      {
        q: 'One motor or one per wheel?',
        options: [
          { name: 'Single motor and differential', pros: 'One inverter, simple control, less to go wrong.', cons: 'No independent control of wheel torque.' },
          { name: 'Hub or per-wheel motors', pros: 'Torque vectoring and regeneration at every wheel.', cons: 'Several inverters, more unsprung mass, far more software.' }
        ],
        takeaway: 'Per-wheel drive is faster when it works. A single motor is where almost every team starts, as Columbia did with one EMRAX 208 and a differential. The rules do not limit the number of motors, but motors on the uprights must have interlocked cabling that opens the shutdown circuit before the wiring fails.',
        sources: ['fsae2027', 'columbiaEv21']
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'Emrax 208 motor, with the gear ratio to the differential chosen from battery voltage and target top speed.', source: 'columbiaEv21' }
    ],
    firmware: {
      intro: 'The motor has no firmware of its own; the inverter runs the current loops. What the vehicle controller must still know and watch about the motor.',
      steps: [
        { title: '1. Read the motor\'s own telemetry', body: 'The inverter reports motor temperature (0x0A2, tenths of a degree), rotor angle, speed and electrical frequency (0x0A5). The controller decodes these the same way as every other inverter frame and timestamps them.', sources: ['evEcu'] },
        { title: '2. Treat motor temperature as a drive fault', body: 'ev-ecu lists "motor above allowable temperature" as drive fault 0x00100000 with a configurable limit, alongside IGBT and inverter internal temperature. Its own notes say thermal throttling should come before the trip but is not yet implemented.', sources: ['evEcu'] },
        { title: '3. Derate before you trip', body: 'A permanent-magnet motor loses magnet strength with heat and can be damaged permanently. Reduce the torque limit progressively as temperature approaches the limit so the driver feels a soft loss of power, not a sudden cut. The rules only allow algorithms to reduce requested torque, never add to it.', sources: ['fsae2027'], },
        { title: '4. Calibrate the position sensor offset', body: 'Field-oriented control needs the electrical angle of the rotor. The offset between the resolver\'s zero and the magnetic axis is set once during commissioning, in the inverter, with the motor spinning freely. A wrong offset shows up as high current for little torque, or torque in the wrong direction. Keep that value under version control with the rest of the inverter configuration.', principle: true },
        { title: '5. Remember it is also a generator', body: 'A spinning permanent-magnet motor produces voltage with the inverter off. The isolation relays, discharge circuit and status lights must assume the DC link can be live whenever the car is rolling, which is one reason the rules require the motors to spin free, with no torque, once the shutdown circuit opens.', sources: ['fsae2027'] }
      ]
    },
    labs: ['powertrain', 'assemblies', 'inverterframe'],
    inside: 'motor'
  },

  resolver: {
    plain: 'Tells the inverter the exact angle of the rotor, which it needs to push current in at the right moment.',
    decisions: [
      {
        q: 'Resolver, encoder or no sensor?',
        options: [
          { name: 'Resolver', pros: 'Just windings and iron at the motor, so it tolerates heat and vibration. Gives absolute angle from power-up.', cons: 'Needs an excitation signal and a converter chip to turn sine and cosine into an angle.' },
          { name: 'Encoder', pros: 'High resolution with simple digital outputs.', cons: 'Electronics live on the hot, vibrating motor. Incremental types need an index or alignment at start-up.' },
          { name: 'Sensorless estimation', pros: 'No sensor, no cable.', cons: 'Works from the motor\'s generated voltage, which is tiny at low speed. Poor exactly where a launch needs it.' }
        ],
        takeaway: 'Traction motors commonly use resolvers for ruggedness; the EMRAX 208 is offered with either. A resolver-to-digital converter such as the AD2S1210 supplies the excitation, tracks the angle, and flags loss or degradation of the signals. Whatever is used, the angle offset between sensor and rotor must be calibrated: an error wastes current and can reverse torque.',
        sources: ['ad2s1210', 'emrax208']
      }
    ],
    inside: 'motor'
  },

  cellmonitor: {
    plain: 'A chip on each battery module that measures every cell and passes the numbers along an isolated link.',
    rules: [
      R('EV.8.4.1', 'The BMS must measure the voltage of every cell (one measurement covers cells wired directly in parallel).'),
      R('EV.8.4.3', 'Every voltage sense wire needs overcurrent protection at the cell tab, rated for the module voltage.'),
      R('EV.8.5.5', 'For lithium cells, the temperature of at least 20% of cells must be monitored, equally distributed, at the negative terminal.'),
      R('EV.8.3.2', 'Galvanic isolation is required at every module-to-module boundary.')
    ],
    decisions: [
      {
        q: 'Which monitor IC?',
        options: [
          { name: 'ADBMS6830B (Analog Devices)', pros: '16 cells per chip, ±1.8 mV lifetime error, 2 Mbit/s isoSPI. A second, independent ADC on every cell for cross-checking. Read data carries a 10-bit error check plus a command counter.', cons: 'Newer part, so less example code in circulation.' },
          { name: 'LTC6811 (Analog Devices)', pros: '12 cells per chip, 1.2 mV total error, 1 Mbit/s isoSPI over up to 100 m of cable. Years of public example code.', cons: 'Older generation with fewer channels and no redundant measurement path.' },
          { name: 'BQ79616-Q1 (Texas Instruments)', pros: '6 to 16 cells per chip, ±1.5 mV, isolated daisy chain with an optional ring so one broken link is survivable. Up to 35 devices in a stack.', cons: 'Different protocol and tooling; the host talks through a separate bridge chip (BQ79600).' }
        ],
        takeaway: 'All three satisfy "measure every cell". What tips it: how many cells are in each module compared with channels per chip, which isolation link you want to debug, and how much working driver code already exists.',
        sources: ['adbms6830b', 'ltc6811', 'bq79616']
      },
      {
        q: 'How do boards at different voltages talk to one controller?',
        options: [
          { name: 'Isolated daisy chain (isoSPI and similar)', pros: 'Two wires through a small transformer between boards. One microcontroller runs the whole pack.', cons: 'A break in the chain cuts off everything beyond it, unless the chain can be driven from both ends.' },
          { name: 'A microcontroller per module on isolated CAN', pros: 'Each module works independently and can be tested by itself.', cons: 'More parts, more firmware images, more to keep in sync.' }
        ],
        takeaway: 'The link exists because each module sits at a different voltage, and the rules demand isolation at every module boundary. Plain SPI would connect those voltages together; an isolated link carries data while blocking the DC.',
        sources: ['ltc6811', 'vmsBms', 'columbiaEv21', 'fsae2027']
      },
      {
        q: 'Passive or active balancing?',
        options: [
          { name: 'Passive (bleed resistor)', pros: 'Built into the monitor IC: the ADBMS6830B switches up to 300 mA per cell. Simple and reliable.', cons: 'Burns the excess as heat. Only moves cells downward.' },
          { name: 'Active (charge shuttling)', pros: 'Moves energy from high cells to low ones instead of wasting it.', cons: 'Extra converters, cost and failure modes.' }
        ],
        takeaway: 'For a small, well-matched race pack that is balanced during charging, passive is enough and comes free with the chip. Balancing is not allowed while the shutdown circuit is open.',
        sources: ['adbms6830b', 'fsae2027']
      }
    ],
    cases: [
      { team: 'Virginia Motorsports', text: 'ADBMS6830B monitors at pack potential, an ADBMS6822 isoSPI bridge, transformer isolation, and a Teensy 4.1 that only ever talks to the bridge.', source: 'vmsBms' },
      { team: 'Columbia EV21', text: 'Six monitoring boards each with an Arduino Micro, reporting to one TI C2000 master.', source: 'columbiaEv21' }
    ],
    firmware: {
      intro: 'What a driver for an Analog Devices monitor chain actually does, in order. The details below are for the LTC6811 and ADBMS6830B; both use the same command frame.',
      steps: [
        { title: '1. Wake the chain', body: 'The link goes idle after about 4.3 ms of silence and the chip goes to sleep after 2 s without a valid command. Before talking, send a wake pulse and wait: up to 400 µs per device on the LTC6811, up to 500 µs on the ADBMS6830B. Then keep polling faster than the 2 s watchdog.', sources: ['ltc6811', 'adbms6830b'] },
        { title: '2. Build the command frame', body: 'Every command is four bytes: two command bytes holding an 11-bit code, then a 15-bit error check (PEC15) with a zero appended. SPI runs in mode 3 (clock idles high), most significant bit first.', code: 'WRCFGA = 0x001  ->  00 01 3D 6E\nRDCVA  = 0x004  ->  00 04 07 C2', sources: ['ltc6811'] },
        { title: '3. Write and verify configuration', body: 'Send WRCFGA followed by six configuration bytes and their error check for each device. In a chain, write data for the farthest device goes first; read data comes back nearest device first. Read it back with RDCFGA and compare.', sources: ['ltc6811', 'adbms6830b'] },
        { title: '4. Start a conversion', body: 'On the LTC6811, ADCV in normal (7 kHz) mode converts all twelve cells in about 2.3 ms; wait or poll before reading. The ADBMS6830B can run continuously and refreshes its results every 1 ms.', code: 'LTC6811 ADCV: 0 1 MD1 MD0 1 1 DCP 0 CH2 CH1 CH0\nMD = 10 (7 kHz), DCP = 0, CH = 000 (all cells) -> 0x360', sources: ['ltc6811', 'adbms6830b'] },
        { title: '5. Read and convert', body: 'Each read command (RDCVA, RDCVB, ...) returns six data bytes: three cells, low byte first, then the error check. Convert the 16-bit code to volts with the formula for your chip. A cleared register is not a voltage: 0xFFFF on the LTC6811 and 0x8000 on the ADBMS6830B mean "no data".', code: 'LTC6811:    V = code x 100 uV          0x80E8 -> 3.3000 V\nADBMS6830B: V = code x 150 uV + 1.5 V  (code is signed)', sources: ['ltc6811', 'adbms6830b'] },
        { title: '6. Reject bad data', body: 'Recalculate the error check over what you received. If it does not match, discard the whole group and count the failure. The ADBMS6830B also returns a 6-bit command counter so the host can tell if the chip missed a command. Track the age of the last good reading: too old is a fault.', sources: ['adbms6830b', 'vmsBms'] },
        { title: '7. Check the sense wires', body: 'A broken sense wire can float to a believable voltage. The LTC6811 method: run ADOW with pull-up at least twice and store the readings, repeat with pull-down, subtract. If the difference for cell n+1 is below −400 mV, wire n is open.', sources: ['ltc6811'] },
        { title: '8. Hand clean data to the policy layer', body: 'Only now compare against limits. The driver\'s job ends at "valid, fresh numbers or an explicit error". Deciding what to do about 4.25 V belongs to the BMS, not the driver.', sources: ['vmsBms'] }
      ]
    },
    labs: ['frame', 'bms'],
    inside: 'battery'
  },

  bms: {
    plain: 'The battery\'s supervisor. It reads the monitor chips, decides whether the pack is safe, and can shut the car down by itself.',
    rules: [
      R('EV.8.3.4', 'The BMS must watch for: voltage or temperature out of range, a blown sense-wire fuse, a missing or interrupted measurement, and a fault in itself.'),
      R('EV.8.3.5', 'On any of those, the BMS must open the shutdown circuit and light the red BMS indicator and the status indicator, which stay on until a manual reset.'),
      R('EV.8.2.3', 'If the BMS, IMD or BSPD opens the shutdown circuit, the car stays disabled until a person resets it at the vehicle; the driver cannot.'),
      R('EV.8.5.2', 'Cell temperature below the lower of the datasheet maximum and 60 °C.')
    ],
    decisions: [
      {
        q: 'Buy a BMS or build one?',
        options: [
          { name: 'Commercial unit', pros: 'Works out of the box with configuration software. State-of-charge estimation and charger control included.', cons: 'Fixed wiring scheme and message set. Little insight into what it is doing.' },
          { name: 'Team-built on a monitor IC', pros: 'Fits the pack exactly. The team owns every threshold and every line of code.', cons: 'A safety-critical embedded project in its own right.' }
        ],
        takeaway: 'Both are common. A commercial unit gets a car running; a custom one is usually justified by packaging, mass, or the wish to understand it fully. Of the three teams in this app, USC runs an Orion BMS while Virginia Motorsports and Columbia built their own.',
        sources: ['uscVcu', 'vmsBms', 'columbiaEv21']
      },
      {
        q: 'How should a battery fault stop the car?',
        options: [
          { name: 'Send a CAN message and let the VCU react', pros: 'Easy. The VCU can cut torque smoothly.', cons: 'Depends on two controllers, a bus and their software all working at the moment something is already wrong.' },
          { name: 'Open the shutdown circuit directly', pros: 'A dedicated output drops the isolation relays regardless of any other controller.', cons: 'Abrupt: the car loses drive immediately.' }
        ],
        takeaway: 'Do both. The hardwired output is the protection and is required; the CAN message is the explanation. The fault must latch so that a problem which clears by itself cannot quietly come back. Note that "missing data" is a listed fault: a driver that silently keeps the last value breaks the rule.',
        sources: ['fsae2027', 'vmsBms']
      },
      {
        q: 'How do you estimate state of charge?',
        options: [
          { name: 'From voltage', pros: 'Simple, no current sensor needed.', cons: 'Voltage sags under load and recovers at rest, so the estimate swings while driving.' },
          { name: 'Counting current in and out', pros: 'Smooth and accurate over a run.', cons: 'Sensor offset accumulates. Needs a known starting point.' },
          { name: 'Model-based (for example a Kalman filter)', pros: 'Combines both and corrects drift.', cons: 'Needs a characterised cell model and more processing.' }
        ],
        takeaway: 'Counting current, corrected by voltage whenever the pack has rested, is the usual practical compromise; the standard university treatment (Plett) starts with exactly those two simple estimators and their limits before moving to Kalman filters, and spends time on what a biased current sensor does to the estimate. LEM, for example, sells a sensor family specifically for state-of-charge estimation, specified by its low offset.',
        sources: ['plettSoc', 'lemSensors']
      }
    ],
    cases: [
      { team: 'Virginia Motorsports', text: 'Teensy 4.1 running FreeRTOS. A cell outside 3.00 to 4.23 V, stale data, a failed error check or an insulation fault sets a latched register that firmware never clears; only a physical reset does.', source: 'vmsBms' },
      { team: 'Columbia EV21', text: 'Custom modular BMS, built to be "more robust and easily integratable", which also controls the isolation relays.', source: 'columbiaEv21' },
      { team: 'USC', text: 'An Orion BMS on the shared vehicle CAN bus.', source: 'uscVcu' }
    ],
    firmware: {
      intro: 'One team\'s task layout, as published. Priority follows consequence: anything that can open the shutdown circuit outranks everything else.',
      steps: [
        { title: 'Fault handler: highest priority, every 50 ms', body: 'Checks the latched fault register and drives the shutdown pin. Nothing may starve this task.', sources: ['vmsBms'] },
        { title: 'Fault frame on CAN: highest priority, every 10 ms', body: 'Publishes the fault word so the rest of the car, and the data log, can see why.', sources: ['vmsBms'] },
        { title: 'Data acquisition: medium priority, every 16 ms', body: 'Reads the whole pack, verifies every error check, and builds one consistent snapshot. A failed check marks the snapshot invalid.', sources: ['vmsBms'] },
        { title: 'Slow telemetry: medium priority, every 500 ms', body: 'State of charge and temperatures for the dashboard.', sources: ['vmsBms'] },
        { title: 'Charger housekeeping: lowest priority', body: 'Charger detection and a 1 Hz heartbeat. If the heartbeat stops, the charger stops: the failure mode is "no charge".', sources: ['vmsBms'] }
      ]
    },
    labs: ['bms', 'frame', 'simulation']
  },

  packcurrent: {
    plain: 'Measures the current flowing in or out of the pack.',
    rules: [
      R('EV.3.2.4', 'All tractive system power must flow through the organiser\'s energy meter.'),
      R('EV.3.3.1', 'The power the energy meter measures must not exceed 80 kW.'),
      R('EV.3.4.1', 'A violation is power or voltage over the limit for 100 ms continuously, or over a 500 ms moving average.')
    ],
    decisions: [
      {
        q: 'Shunt or magnetic sensor?',
        options: [
          { name: 'Shunt resistor', pros: 'Accurate and linear with very low drift: good for counting charge.', cons: 'Sits at pack voltage, so it needs an isolated amplifier. Dissipates heat.' },
          { name: 'Open-loop Hall sensor', pros: 'Clips around the cable. Isolated by nature, cheap, no added resistance.', cons: 'Offset drifts with temperature, which hurts accuracy at low current.' },
          { name: 'Closed-loop or fluxgate sensor', pros: 'Isolated and accurate.', cons: 'Larger, more expensive, draws more supply current.' }
        ],
        takeaway: 'The use decides: state-of-charge estimation needs low offset (shunt, fluxgate, or the newer closed-loop Hall parts whose offset drift is in the single-digit ppm/°C range); protection and the brake plausibility device only need a fast, isolated signal, and ev-ecu reserves a plain analogue input for exactly that.',
        sources: ['lemClosedLoop', 'evEcu']
      }
    ],
    cases: [
      { team: 'lflaherty/ev-ecu', text: 'The ECU connector reserves an analogue input for "battery current sensor for BSPD".', source: 'evEcu' }
    ]
  },

  vcu: {
    plain: 'The car\'s main computer. It reads the driver, checks everything is ready, and asks the inverter for torque.',
    rules: [
      R('T.4.2.5', 'If the two pedal sensors disagree for more than 100 ms, power to the motors must stop immediately.'),
      R('EV.4.7.1', 'The controller must watch for the mechanical brakes engaged while the accelerator signals more than 25% travel.'),
      R('EV.4.7.2', 'If both happen together, motor power is cut immediately and stays off until the pedal is back below 5%.'),
      R('EV.10.6.2', 'Ready to Drive needs all three: tractive system active, the brake pedal held, and a manual driver action such as a button.'),
      R('EV.10.2', 'Systems must energise in order: low voltage, then tractive system active, then Ready to Drive.')
    ],
    decisions: [
      {
        q: 'Which microcontroller?',
        options: [
          { name: 'STM32', pros: 'CAN controllers, ADCs and timers on one chip. Large ecosystem and good RTOS support.', cons: 'The vendor configuration layer takes time to learn.' },
          { name: 'Teensy 4.1 (NXP i.MX RT)', pros: 'Very fast and quick to get running with Arduino-style tooling.', cons: 'A hobbyist board form factor. Fewer production-style debugging tools.' },
          { name: 'Control-oriented MCU (for example TI C2000)', pros: 'Peripherals designed for control loops and power electronics.', cons: 'Smaller community and steeper tooling.' }
        ],
        takeaway: 'A control unit needs CAN, a handful of analogue inputs and timers. Almost any modern 32-bit MCU has the performance; teams choose on peripherals, tools and what the last generation of students already knew. All three appear in the case studies: STM32 at ev-ecu and USC, a Teensy 4.1 at Virginia Motorsports, a TI C2000 as Columbia\'s BMS master.',
        sources: ['evEcu', 'uscVcu', 'vmsBms', 'columbiaEv21']
      },
      {
        q: 'Super-loop or real-time operating system?',
        options: [
          { name: 'Single loop', pros: 'Easy to reason about. No shared-data hazards.', cons: 'Every job waits for every other. Timing drifts as features are added.' },
          { name: 'RTOS tasks', pros: 'Each job gets its own period and priority. Safety checks can pre-empt logging.', cons: 'Shared data needs protection. Priority mistakes cause subtle bugs.' }
        ],
        takeaway: 'Once the firmware has several jobs with different deadlines (pedal sampling, CAN, state machine, logging) an RTOS pays for itself. FreeRTOS\'s own FAQ puts it the same way: you do not need an RTOS to write good embedded software, but as the application grows its services become beneficial. All three team firmwares in this app run FreeRTOS.',
        sources: ['freertosFaq', 'evEcu', 'uscVcu', 'vmsBms']
      },
      {
        q: 'How should the code be layered?',
        options: [
          { name: 'Everything in one module', pros: 'Fast to write.', cons: 'Changing the inverter means rewriting the vehicle logic.' },
          { name: 'Vehicle logic → device drivers → peripheral drivers', pros: 'Vehicle logic speaks in torque and states; a device driver translates to one product\'s CAN messages; a peripheral driver owns the registers.', cons: 'More files and interfaces up front.' }
        ],
        takeaway: 'Layering is what lets you test vehicle logic on a PC and swap an inverter without touching the state machine.',
        sources: ['evEcu']
      }
    ],
    cases: [
      { team: 'lflaherty/ev-ecu', text: 'STM32 F7 ECU on a 24 V supply with three CAN buses, a six-channel power distribution stage and layered firmware: vehicle logic, vehicle interface, device drivers, peripheral drivers.', source: 'evEcu' },
      { team: 'USC', text: 'STM32 VCU using FreeRTOS, with one task per vehicle component sharing a common data structure.', source: 'uscVcu' }
    ],
    labs: ['vcu', 'simulation', 'pinout']
  },

  apps: {
    plain: 'Two separate sensors on the accelerator pedal, so that one failing cannot command torque.',
    rules: [
      R('T.4.2.2', 'Two or more electrically separate sensors.'),
      R('T.4.2.3', 'Different transfer functions, a pull-up or pull-down that reads an open circuit as 0% pedal, and outputs at least 10% apart above 10% travel.'),
      R('T.4.2.4', 'Implausibility: the sensors differ by more than 10% of pedal travel.'),
      R('T.4.2.5', 'Implausibility for more than 100 ms: motor power must stop.')
    ],
    decisions: [
      {
        q: 'Why must the two sensors have different transfer functions?',
        options: [
          { name: 'Identical outputs', pros: 'Simple comparison.', cons: 'If the two signal wires short together they still agree perfectly, at whatever voltage the short produces.' },
          { name: 'Different slope or offset', pros: 'Each pedal position maps to a unique pair of voltages. A short gives a pair that matches no real position and is rejected.', cons: 'Each channel needs its own calibration.' }
        ],
        takeaway: 'Redundancy only helps if the two channels cannot fail in the same way. The rules require electrically separate sensors with different curves, and a pull-up or pull-down so an open circuit reads as 0% pedal; giving each its own supply and ground goes one step further.',
        sources: ['fsae2027']
      },
      {
        q: 'Why not use the full 0 to 5 V range?',
        options: [
          { name: 'Use the whole range', pros: 'Maximum resolution.', cons: 'A broken wire (0 V) or a short to supply (5 V) looks like a valid pedal position.' },
          { name: 'Keep clear of both rails', pros: 'Anything near 0 V or 5 V can only be a wiring fault.', cons: 'Slightly less resolution.' }
        ],
        takeaway: 'The rules treat an out-of-range signal as an implausibility, and require that an open circuit reads as 0% pedal. Staying clear of both rails is how an analogue sensor meets that.',
        sources: ['fsae2027']
      },
      {
        q: 'Potentiometer or Hall-effect sensor?',
        options: [
          { name: 'Potentiometer', pros: 'Cheap and ratiometric.', cons: 'A sliding contact wears and gets noisy.' },
          { name: 'Hall-effect (contactless)', pros: 'No wear. Dual-output parts are widely available.', cons: 'Needs a magnet and a clean supply.' }
        ],
        takeaway: 'Contactless sensors are standard in road cars for exactly this job: pedal sensor ICs are sold as fully redundant dual-output Hall devices with built-in failure diagnostics, which maps directly onto the two-sensor rule.',
        sources: ['as5262']
      }
    ],
    cases: [
      { team: 'lflaherty/ev-ecu', text: 'Separate analogue inputs for throttle sensor A and throttle sensor B on the ECU connector.', source: 'evEcu' }
    ],
    labs: ['vcu', 'simulation']
  },

  shutdown: {
    plain: 'A single loop of wire through every safety switch. Break it anywhere and the battery disconnects.',
    rules: [
      R('EV.8.1.1', 'In series in the loop: BMS, IMD, BSPD, interlocks, both master switches, three shutdown buttons, the brake over-travel switch and the inertia switch.'),
      R('EV.8.1.2', 'The loop itself carries the current that drives the isolation relay coils and the precharge relay.'),
      R('EV.8.1.5', 'BMS, IMD and BSPD must each have a completely independent way of opening the loop.'),
      R('EV.8.2.2', 'When it opens: current stops immediately, tractive voltage falls to Low Voltage within 5 s, motors spin free.'),
      R('EV.8.2.3', 'After a BMS, IMD or BSPD trip, only a manual reset by a person at the car re-enables it, and the shutdown buttons or master switch cannot.')
    ],
    decisions: [
      {
        q: 'Why a hardwired loop and not a software shutdown?',
        options: [
          { name: 'Software over CAN', pros: 'Flexible, and every event is logged.', cons: 'Works only if the sender, the bus, the receiver and all their code are healthy, at the very moment something has failed.' },
          { name: 'Series loop feeding the relay coils', pros: 'Opening any contact removes coil power. A cut wire, a pulled connector or a dead supply all fail to "off".', cons: 'Harder to diagnose: you know the loop is open, not where.' }
        ],
        takeaway: 'The safety function is the wire. Controllers watch the loop and report which element opened, but they are observers, not part of the path. That is also why the BSPD is non-programmable and the IMD must work without programmable logic.',
        sources: ['fsae2027']
      }
    ],
    labs: ['simulation']
  },

  imd: {
    plain: 'Constantly checks that the high-voltage system has not started leaking to the chassis.',
    rules: [
      R('EV.8.6.2', 'Must be an approved model from the list in the Rules FAQ on the event website.'),
      R('EV.8.6.3', 'Response value: 500 Ω per volt or higher, relative to maximum tractive system voltage.'),
      R('EV.8.6.4', 'It must detect an insulation failure and a failure of itself, without any programmable logic.'),
      R('EV.7.5.1', 'The tractive system and the grounded low-voltage system must be completely galvanically separated.')
    ],
    decisions: [
      {
        q: 'Why monitor insulation at all?',
        options: [
          { name: 'Ground one side of the battery (like a 12 V car)', pros: 'Simple, and a fault blows a fuse.', cons: 'Touching the other terminal and the chassis is a shock path at full pack voltage.' },
          { name: 'Float the battery and monitor it', pros: 'A single contact with either terminal completes no circuit. The first insulation failure is detected before a second one makes it dangerous.', cons: 'Needs a device that measures megohms on a live system.' }
        ],
        takeaway: 'A floating system is only safe while it stays floating. The IMD is what proves that, continuously. At 500 Ω per volt, a 600 V system must trip below 300 kΩ.',
        sources: ['fsae2027']
      },
      {
        q: 'Why do teams use the Bender IR155?',
        options: [
          { name: 'Bender IR155-3203 / 3204', pros: 'The device most Formula Student teams fit, and the one earlier rule editions named outright. Measures insulation up to 10 MΩ, runs from a 12 V or 24 V supply, self-tests automatically, and gives a simple OK/not-OK output plus a PWM signal encoding the measured resistance.', cons: 'The first measurement after power-up takes seconds, which start-up logic has to allow for.' },
          { name: 'Team-built monitor', pros: 'None that outweigh the risk.', cons: 'The 2027 rules only accept models on the approved list. Not a place to innovate.' }
        ],
        takeaway: 'Check the current approved-model list before buying. The OK output goes into the shutdown loop through a latch with no programmable logic. The PWM output is for the controller to log and display.',
        sources: ['fsae2027', 'ir155']
      }
    ],
    labs: ['simulation']
  },

  bspd: {
    plain: 'A small analogue circuit that cuts power if the car is braking hard and still drawing drive current.',
    rules: [
      R('EV.8.7.1', 'A standalone, non-programmable circuit, in addition to the software pedal check.'),
      R('EV.8.7.2', 'Opens the shutdown circuit when hard braking and a current equal to 5 kW at nominal battery voltage both persist for more than 0.5 s.'),
      R('EV.8.7.3', 'An open or shorted sensor input must also open the shutdown circuit.'),
      R('EV.8.7.4', 'It must be testable on the car by injecting a simulated current, without powering the motors.')
    ],
    decisions: [
      {
        q: 'The VCU already checks brake against throttle. Why a second device?',
        options: [
          { name: 'VCU software only', pros: 'No extra hardware.', cons: 'The fault being guarded against may be the VCU itself: a stuck torque command or a crashed task.' },
          { name: 'Independent comparators and a timer', pros: 'Shares nothing with the VCU: its own sensors in, a relay contact out. Simple enough to verify completely on a bench.', cons: 'Thresholds are set by resistors, so changing them means soldering.' }
        ],
        takeaway: 'It watches outcomes (brake pressure and battery current), not intentions. Whatever the software believes, if the car is braking hard and still pulling power, the loop opens. The 0.5 s is a persistence filter, so a brief overlap during a pedal transition does not trip it.',
        sources: ['fsae2027']
      }
    ],
    labs: ['simulation']
  },

  tsal: {
    plain: 'The lights on top of the roll hoop that tell everyone around the car whether high voltage is present and whether a safety device has tripped. Teams still say "TSAL"; the 2027 rules split the job into a Ready to Move Light and a Tractive System Status Indicator.',
    rules: [
      R('EV.6.2.7', 'Ready to Move Light (amber, one forward, one aft): flashes at 0.66 to 1.33 Hz when voltage outside the container is 60 V or more; clearly off below 50 V.'),
      R('EV.6.2.6', 'It is powered by the low-voltage system and controlled directly by the measured tractive voltage with hardwired electronics; software control is not permitted.'),
      R('EV.6.1.7', 'Tractive System Status Indicator (green right, red left): green steady with no faults; red flashing at 2.5 to 5 Hz when the BMS or IMD has tripped.'),
      R('EV.6.3.2', 'Lamp check: every indicator lights continuously for 2 to 6 s within a second of the low-voltage master switch coming on.'),
      R('T.9.1.1', 'High Voltage means more than 60 V DC or 25 V AC RMS.')
    ],
    decisions: [
      {
        q: 'Why is the voltage light driven by measured voltage instead of the controller\'s state?',
        options: [
          { name: 'Driven by VCU state', pros: 'One GPIO.', cons: 'Shows what the software thinks. After a relay opens, the capacitors can still hold a dangerous voltage for seconds. Not permitted.' },
          { name: 'Driven by a hardwired voltage detector', pros: 'Shows what is physically there, including stored charge and a welded relay.', cons: 'Needs an isolated detection circuit on the high-voltage bus with a defined on/off band (on at 60 V, off below 50 V).' }
        ],
        takeaway: 'The light is for marshals and team members deciding whether to touch the car. It has to tell the truth even when every controller is off.',
        sources: ['fsae2027']
      },
      {
        q: 'Why two separate indicator systems?',
        options: [
          { name: 'One light for everything (the old TSAL)', pros: 'One circuit, one lamp.', cons: 'Mixes two different messages: "is it live?" and "has a safety device tripped?". Earlier rulebooks did this with red and green states of a single light.' },
          { name: 'Voltage light plus fault indicator', pros: 'An amber light answers "is high voltage present?" from the hardware alone. A separate green/red indicator answers "is the safety system healthy?", driven by the BMS and IMD latches.', cons: 'More lamps and wiring at the top of the roll hoop, each with its own lamp check.' }
        ],
        takeaway: 'The 2027 split makes each lamp mean one thing. Older team cars and most online write-ups still describe the single-lamp TSAL, so expect both when reading.',
        sources: ['fsae2027']
      }
    ]
  },

  can: {
    plain: 'The shared two-wire network that the controllers use to exchange status and commands.',
    decisions: [
      {
        q: 'Why CAN between controllers and not something simpler?',
        options: [
          { name: 'CAN', pros: 'Any node can transmit. Collisions are resolved by identifier without losing data. Differential signalling shrugs off noise. Error checking, acknowledgement and fault confinement are built into the hardware. Up to 1 Mbit/s.', cons: 'Eight data bytes per classical frame. Needs correct termination.' },
          { name: 'SPI', pros: 'Fast and simple between chips on one board.', cons: 'One master, a select line per device, single-ended signals, no built-in error check. Not suited to a wiring harness.' },
          { name: 'UART / RS-485', pros: 'Simple point-to-point link.', cons: 'No arbitration or addressing. The application has to invent a protocol.' },
          { name: 'CAN FD', pros: 'Same wiring, up to 64 data bytes and a faster data phase.', cons: 'Every node on the bus must support it.' }
        ],
        takeaway: 'CAN was designed for exactly this: several controllers, an electrically noisy vehicle, and messages that must either arrive intact or be known to have failed.',
        sources: ['sloa101']
      },
      {
        q: 'One bus or several?',
        options: [
          { name: 'One bus for everything', pros: 'Least wiring. One place to plug in a logger.', cons: 'One faulty node or damaged wire silences the whole car. The busiest device sets the load for all.' },
          { name: 'Separate buses', pros: 'A fault stays on its own bus. Devices with fixed, conflicting identifiers can coexist.', cons: 'More transceivers, wiring and connector pins.' }
        ],
        takeaway: 'Both appear in real cars; the trade is wiring against fault containment.',
        sources: ['uscVcu', 'evEcu']
      },
      {
        q: 'How is a frame turned into numbers?',
        options: [
          { name: 'Hard-code the byte positions', pros: 'Quick for one message.', cons: 'Every node and tool must agree by hand. Mistakes in byte order or scaling are silent.' },
          { name: 'A DBC file', pros: 'One description of every message: identifier, bit position, length, byte order, scale, offset and unit. Code and logging tools are generated from it.', cons: 'Has to be kept current and shared.' }
        ],
        takeaway: 'An identifier and eight bytes mean nothing without the database. Never guess a layout from a message name.',
        sources: ['cssDbc']
      }
    ],
    cases: [
      { team: 'USC', text: 'One CAN bus at 500 kbit/s. Outgoing messages go through queues handled by a single task; a separate task processes incoming frames.', source: 'uscVcu' },
      { team: 'lflaherty/ev-ecu', text: 'Three buses on the ECU connector: one for the inverter, one for the BMS and a spare provisioned for the dashboard.', source: 'evEcu' }
    ],
    firmware: {
      intro: 'What every receiving node does with a frame.',
      principle: true,
      steps: [
        { title: '1. Filter', body: 'The CAN controller discards identifiers this node does not care about, in hardware.' },
        { title: '2. Timestamp', body: 'Record when the frame arrived. A value is only as good as its age.' },
        { title: '3. Decode', body: 'Extract each signal using its start bit, length and byte order, then apply scale and offset to get engineering units.' },
        { title: '4. Validate', body: 'Check the range, and check the frame is arriving at its expected period. A missing heartbeat is a fault even if the last value looked fine.' }
      ]
    },
    labs: ['dbc', 'can']
  },

  cancontroller: {
    plain: 'The part of the microcontroller that builds and checks CAN frames.',
    decisions: [
      {
        q: 'How should received frames reach the application?',
        options: [
          { name: 'Poll in the main loop', pros: 'Simple.', cons: 'A burst of frames overflows the small hardware buffer and messages are lost.' },
          { name: 'Interrupt into a queue', pros: 'Each frame is copied out the moment it arrives; a task decodes it later.', cons: 'The interrupt must stay short, and the queue needs sizing.' }
        ],
        takeaway: 'Interrupt plus queue is the standard pattern: the interrupt only moves bytes, tasks do the thinking.',
        sources: ['vmsBms', 'uscVcu', 'evEcu']
      },
      {
        q: 'What should happen at bus-off?',
        options: [
          { name: 'Recover automatically and carry on', pros: 'Rides through a brief disturbance.', cons: 'Can hide a real wiring fault and keep disturbing the bus.' },
          { name: 'Treat as a fault and recover deliberately', pros: 'The vehicle state machine knows communication was lost and can respond safely.', cons: 'More logic to write.' }
        ],
        takeaway: 'The controller keeps a transmit and a receive error counter. Above 127 it goes error-passive; when the transmit counter passes 255 it goes bus-off and stops transmitting until it has seen 128 sequences of eleven recessive bits. Firmware should watch those counters; they are the earliest warning of a physical-layer problem.',
        sources: ['can20']
      }
    ],
    cases: [
      { team: 'Virginia Motorsports', text: 'A receive interrupt enqueues frames; a task blocks on the queue and decodes them.', source: 'vmsBms' }
    ],
    labs: ['dbc', 'can']
  },

  cantransceiver: {
    plain: 'The chip between the microcontroller\'s logic pins and the two bus wires.',
    decisions: [
      {
        q: 'What does the transceiver decide that software cannot?',
        options: [
          { name: 'Supply and logic level', pros: '3.3 V parts connect directly to a 3.3 V MCU.', cons: 'A 5 V part needs a separate logic-level pin or level shifting.' },
          { name: 'Isolation', pros: 'An isolated transceiver lets a node on a different ground join the bus safely.', cons: 'Needs an isolated supply for the bus side.' },
          { name: 'Protection and standby', pros: 'Bus-fault tolerance protects against harness shorts; standby saves power.', cons: 'A floating standby pin is a classic reason a board "has no CAN".' }
        ],
        takeaway: 'Software sees only TXD and RXD. Whether the bus actually works is decided by this chip, the wiring and the termination: a 120 Ω resistor at each of the two physical ends of the cable, and nowhere else.',
        sources: ['sloa101']
      }
    ],
    labs: ['can']
  },

  lv: {
    plain: 'The small battery and fused wiring that power every controller, sensor and relay coil.',
    rules: [
      R('T.9.1.2', 'Low Voltage means 60 V DC or less.'),
      R('T.9.2.2', 'The low-voltage battery needs overcurrent protection that trips at or below the cells\' maximum discharge current.'),
      R('EV.7.6.1', 'Every electrical system, low and high voltage, needs overcurrent protection.'),
      R('EV.4.4.1', 'The low-voltage system is grounded to the chassis and must work with the tractive battery pack removed.')
    ],
    decisions: [
      {
        q: '12 V or 24 V?',
        options: [
          { name: '12 V', pros: 'The widest choice of automotive pumps, fans, relays and sensors.', cons: 'Twice the current for the same power, so heavier wire and more voltage drop.' },
          { name: '24 V', pros: 'Half the current. Contactor coils and industrial parts are readily available.', cons: 'Fewer automotive accessories. Sensors still need a regulated 5 V rail.' }
        ],
        takeaway: 'Either works. What matters is that every load, including the isolation relay coils and the insulation monitor, is rated for the one you choose: the Bender IR155 comes in 12 V and 24 V supply variants and the EV200 contactor coil is offered for both. ev-ecu chose 24 V.',
        sources: ['evEcu', 'ir155', 'ev200']
      },
      {
        q: 'Fuses or electronic power switches?',
        options: [
          { name: 'Fuse box', pros: 'Simple, visible, cheap.', cons: 'No information: you find out a fuse blew when something stops.' },
          { name: 'Smart high-side switches (a power distribution module)', pros: 'Each output is switched and current-limited by a controller, which can report faults and shed loads.', cons: 'More design work, and it puts software in the supply path.' }
        ],
        takeaway: 'Whichever is used, check supply voltage first when several unrelated faults appear together. One controller browning out looks like a dozen separate problems.',
        sources: ['evEcu']
      }
    ],
    cases: [
      { team: 'lflaherty/ev-ecu', text: 'A 24 V system with six switched power outputs built into the ECU and two always-on 5 V sensor supplies.', source: 'evEcu' }
    ],
    labs: ['pinout']
  },

  dcdc: {
    plain: 'Takes a little power from the main pack and converts it down to run the low-voltage system.',
    rules: [
      R('EV.7.5.1', 'High-voltage and low-voltage systems must be completely galvanically separated, so this converter must be an isolated type.'),
      R('EV.7.5.4', 'An HV DC/DC converter is one of the few low-voltage items allowed inside the tractive battery container.')
    ],
    decisions: [
      {
        q: 'Low-voltage battery alone, or add a DC/DC converter?',
        options: [
          { name: 'Battery only', pros: 'Simple and naturally isolated from the pack.', cons: 'Must be big enough for the whole event and charged between runs.' },
          { name: 'Battery plus isolated DC/DC', pros: 'A small battery starts the car; the converter carries pumps and fans once high voltage is on.', cons: 'Another high-voltage component to fuse, enclose and isolate.' }
        ],
        takeaway: 'A low-voltage battery is needed either way: the rules require the low-voltage system to work with the pack removed, and something has to power the controllers and close the relays before any high voltage exists.',
        sources: ['fsae2027']
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'A 300 W cooling system fed by a DC/DC converter from the high-voltage pack.', source: 'columbiaEv21' }
    ]
  },

  sensors: {
    plain: 'The thermistors, pressure sensors and voltage taps that let the controllers see what is happening.',
    rules: [
      R('EV.8.5.5', 'Temperature of at least 20% of lithium cells must be monitored, equally distributed.'),
      R('EV.8.5.3', 'Cell temperature is measured at the negative terminal of the cell.'),
      R('EV.8.5.4', 'The sensor touches the negative terminal itself, or its busbar less than 10 mm from the weld or clamp.'),
      R('EV.8.5.7', 'Temperature sensors need electrical isolation between sensor and cell or in the sensing circuit.'),
      R('T.4.3.3', 'A brake sensor failure lasting more than 100 ms must cut motor power.')
    ],
    decisions: [
      {
        q: 'Which temperature sensor for cells?',
        options: [
          { name: 'NTC thermistor', pros: 'Tiny, cheap, and reads directly on the monitor IC\'s spare inputs.', cons: 'Non-linear: needs a lookup table. An open or shorted sensor reads as an extreme temperature and must be recognised as a fault.' },
          { name: 'Digital temperature IC', pros: 'Calibrated, with a digital output.', cons: 'A data bus running through a high-voltage pack, and more cost per point.' },
          { name: 'Thermocouple', pros: 'Very wide range.', cons: 'Microvolt signals need amplification; overkill below 100 °C.' }
        ],
        takeaway: 'Thermistors on the monitor IC are the norm because the measurement stays local to the module and crosses the isolation barrier as data. Isolation between the sensor and the cell terminal is a rule, not an option. Linearising the NTC is a firmware job: a lookup table (as USC does) or the Steinhart-Hart equation, which needs natural logarithms the table avoids.',
        sources: ['uscVcu', 'vmsBms', 'tiSnoaa12']
      }
    ],
    cases: [
      { team: 'Virginia Motorsports', text: '48 thermistors, six per segment (module), read by the cell-monitor ICs.', source: 'vmsBms' }
    ]
  },

  cooling: {
    plain: 'Pump, radiator and fans that carry heat away from the motor, inverter and sometimes the battery.',
    rules: [
      R('EV.8.5.2', 'Cells must stay below 60 °C (or the datasheet limit if lower).'),
      R('EV.7.5.4', 'Cooling fans are among the few low-voltage items allowed inside the tractive battery container.')
    ],
    decisions: [
      {
        q: 'Air or liquid cooling for the motor and inverter?',
        options: [
          { name: 'Air', pros: 'No pump, hoses or coolant.', cons: 'Cannot remove enough heat from a compact high-power motor or inverter for long.' },
          { name: 'Liquid loop', pros: 'Moves kilowatts from a small surface to a radiator placed in clean airflow.', cons: 'Mass, leaks, and a pump that becomes a single point of failure.' }
        ],
        takeaway: 'Compact traction motors and inverters are almost always liquid cooled. The EMRAX 208 data sheet shows why: the same motor is rated 33 kW continuous air-cooled, 47 kW liquid-cooled and 52 kW with both, at an identical 86 kW peak. The control question is what to do when cooling falls behind: reduce torque early and smoothly instead of tripping at the limit.',
        sources: ['emrax208', 'columbiaEv21']
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'A 300 W liquid and air system intended to keep inverter, motor and batteries "well below the required 60C".', source: 'columbiaEv21' },
      { team: 'USC', text: 'A cooling task reads two coolant thermistors, before and after the radiator, every 2 s. The published version logs the temperatures; pump and fan control are not in that task.', source: 'uscVcu' },
      { team: 'lflaherty/ev-ecu', text: 'Pumps and fans are switched through the ECU\'s 24 V power distribution channels; the PDM module is a thin layer over GPIO that also records each channel\'s state.', source: 'evEcu' }
    ],
    firmware: {
      intro: 'What a cooling task does, built from one published task and the control problem it leaves open.',
      steps: [
        { title: '1. Sample the thermistors', body: 'USC reads two NTC thermistors on ADC channels, one before the radiator and one after, every 2 seconds, from a shared ADC snapshot that reports whether the conversion succeeded.', sources: ['uscVcu'] },
        { title: '2. Turn volts into ohms', body: 'The thermistor is the lower leg of a divider from a 5 V reference. USC\'s divider uses a 14 666 Ω upper resistor, so R = 14666 × V ÷ (5 − V).', code: 'R_thermistor = 14666 * V / (5 - V)', sources: ['uscVcu'] },
        { title: '3. Turn ohms into degrees with a table', body: 'An NTC curve is not linear. USC interpolates a ten-point resistance-to-temperature table (10 000 Ω at 25 °C, 2 490 Ω at 60 °C, 338 Ω at 120 °C) rather than solving the Steinhart-Hart equation on every sample.', code: '332776 Ω → −40 °C   10000 Ω → 25 °C\n  2490 Ω →  60 °C     338 Ω → 120 °C', sources: ['uscVcu'] },
        { title: '4. Recognise a broken sensor', body: 'An open thermistor reads as the top of the table and a shorted one as the bottom. Both are physically unlikely in a running car and should be flagged as sensor faults rather than acted on as real temperatures.', principle: true },
        { title: '5. Decide what the pump and fans do', body: 'With motor, inverter and coolant temperatures in hand, the policy is usually: pump on whenever high voltage is active, fans staged by coolant temperature, and torque derated as the hottest component approaches its limit. The published USC task does not yet close this loop; ev-ecu provides the switched 24 V channels to do it.', sources: ['uscVcu', 'evEcu'] },
        { title: '6. Feed the watchdog', body: 'The cooling task sets its bit in the independent watchdog event group every cycle, like every other task. A hung cooling task is caught the same way as a hung torque task.', sources: ['uscVcu'] }
      ]
    },
    labs: ['powertrain']
  },

  dashboard: {
    plain: 'What the driver sees and hears, and the logger that records everything for later.',
    rules: [
      R('EV.10.7.2', 'Ready to Drive sound: continuous for 1 to 3 seconds, at least 80 dBA, easily recognisable.'),
      R('EV.8.3.6', 'The BMS indicator must be red, marked "BMS", and clearly visible to the seated driver in bright sunlight.'),
      R('EV.8.6.6', 'The IMD indicator must be red, marked "IMD", and clearly visible to the seated driver in bright sunlight.')
    ],
    decisions: [
      {
        q: 'Should fault lights go through the display software?',
        options: [
          { name: 'Draw them on the screen', pros: 'Flexible. No extra wiring.', cons: 'If the display or its CAN link fails, the warning disappears with it.' },
          { name: 'Dedicated lamps driven by the fault latch', pros: 'Stay lit whenever the latch is tripped, whatever the display is doing.', cons: 'A few more wires to the cockpit.' }
        ],
        takeaway: 'Use the screen for information and dedicated lamps for safety status; the rules settle it anyway by requiring separate red lamps marked BMS and IMD that stay lit until a manual reset. On the screen, show the age of each value: an old number that looks plausible is worse than a blank.',
        sources: ['fsae2027']
      }
    ]
  }
};

// Components that do not exist in base.js.
export const added = [
  {
    id: 'cell',
    name: 'Battery cell',
    family: 'HIGH VOLTAGE',
    color: '#f0a44b',
    summary: 'The single electrochemical unit that stores energy. Its chemistry, shape and ratings set the limits for the whole car.',
    how: 'Lithium ions move between two electrodes through an electrolyte. Charging pushes them one way, discharging lets them flow back and drives current through the external circuit. The cell is only safe inside a window of voltage, current and temperature given in its datasheet.',
    inputs: ['Charge current', 'Heat removal'],
    outputs: ['Discharge current at 2.5 to 4.2 V (typical NMC power cell)', 'Heat from internal resistance'],
    interfaces: ['Welded or bolted tabs to the busbar', 'Voltage sense tap', 'Thermal contact to a temperature sensor'],
    failures: ['Overcharge', 'Over-discharge', 'Overtemperature', 'Internal short circuit', 'Capacity fade and rising resistance with age'],
    design: 'Pack voltage is cell voltage times the series count. Pack capacity is cell capacity times the parallel count. Heat generated is current squared times internal resistance.',
    reference: 'Example figures on this page are from the Molicel INR-21700-P45B data sheet.'
  },
  {
    id: 'tsal',
    name: 'Status lights on the roll hoop (TSAL)',
    family: 'INDEPENDENT SAFETY',
    color: '#ef6f76',
    summary: 'Lamps on the roll hoop: an amber Ready to Move Light that flashes whenever high voltage is present outside the battery container, and a green/red Tractive System Status Indicator that turns red when the BMS or IMD has tripped.',
    how: 'A hardwired circuit senses the voltage on the vehicle side of the isolation relays and flashes the amber lights at 0.66 to 1.33 Hz above 60 V. A separate indicator shows steady green while no fault is latched and flashing red at 2.5 to 5 Hz once the BMS or IMD has opened the shutdown circuit. Every lamp lights for 2 to 6 s as a lamp check when the low-voltage system comes on.',
    inputs: ['Tractive system voltage (isolated detection)', 'BMS and IMD fault latches', 'Low-voltage supply'],
    outputs: ['Amber flashing (HV present)', 'Green steady or red flashing (fault)'],
    interfaces: ['Isolated high-voltage detection circuit', 'Low-voltage lamp drivers', 'Lamp-check circuit or OR gate'],
    failures: ['Lamp or driver failure', 'Detection circuit fault', 'Wrong state shown after a relay weld', 'Lamp check masking a dead lamp'],
    design: 'The voltage detection must sit on the vehicle side of the isolation relays, so it reports what is actually reachable outside the container. Only the lamp check may use software.',
    reference: 'Requirements quoted from Formula SAE Rules 2027 V1.0 (EV.6). Older editions specified a single red/green TSAL.'
  }
];
