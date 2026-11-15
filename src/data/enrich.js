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

const R = (id, text) => ({ id, text, source: 'fsae2024' });

export const enrich = {
  cell: {
    plain: 'One battery cell. Everything else in the pack exists to connect, protect or measure these.',
    rules: [
      R('EV.3.3.2', 'Maximum voltage between any two points of the tractive system: 600 V DC.'),
      R('EV.7.5.2', 'Cell temperature must stay below the lower of the datasheet maximum and 60 °C.'),
      R('EV.7.4.2', 'Cell voltages must stay inside the limits in the cell datasheet.')
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
        takeaway: 'The choice is as much about what the team can build reliably as about the cell: spot-welding hundreds of cylinders versus clamping and joining pouch tabs.',
        principle: true
      },
      {
        q: 'How many in series and in parallel?',
        options: [
          { name: 'More in series', pros: 'Higher voltage, so less current (and thinner cable, less heat) for the same power.', cons: 'More cell voltages to monitor. Capped by the 600 V limit and by the voltage rating of the inverter and motor.' },
          { name: 'More in parallel', pros: 'More current capability and more energy at the same voltage.', cons: 'More mass. Parallel groups share one voltage measurement, so one weak cell is harder to spot.' }
        ],
        takeaway: 'Start from the rules: 600 V maximum, 80 kW maximum, and each segment under 120 V and 6 MJ. With a 4.2 V cell the most you can put in series is 142 (596 V). At 80 kW and that pack\'s 511 V nominal the cells must deliver about 156 A, which needs four 45 A cells in parallel. Try it in the pack sizing lab.',
        sources: ['fsae2024', 'p45b']
      }
    ],
    labs: ['pack'],
    inside: 'battery'
  },

  accumulator: {
    plain: 'The battery pack: cells grouped into segments inside one sealed, removable container.',
    rules: [
      R('EV.5.1.2', 'Each segment: less than 120 V DC and no more than 6 MJ.'),
      R('EV.5.4.1', 'Each container needs at least one fuse and at least two isolation relays.'),
      R('EV.4.3.3', 'The container must be completely closed at all times.')
    ],
    decisions: [
      {
        q: 'Why split the pack into segments?',
        options: [
          { name: 'One continuous string', pros: 'Fewest connectors.', cons: 'Anyone working on it is exposed to full pack voltage. Not permitted.' },
          { name: 'Several segments with maintenance plugs', pros: 'With the plugs out, no part of the open pack exceeds 120 V. One segment can be swapped without rebuilding the pack.', cons: 'More connectors, each one a resistance and a possible failure point.' }
        ],
        takeaway: 'Segmentation is a safety and serviceability decision. It also sets how many cells each monitor board has to measure, which feeds straight into the choice of monitor IC.',
        sources: ['fsae2024']
      },
      {
        q: 'How is the pack cooled?',
        options: [
          { name: 'Forced air', pros: 'Light and simple, nothing to leak.', cons: 'Limited heat removal. Cells in the middle run hotter than those at the edge.' },
          { name: 'Liquid cold plate', pros: 'More heat removed and more even cell temperatures.', cons: 'Mass, pumps, hoses, and coolant next to high voltage.' }
        ],
        takeaway: 'The hard limit is 60 °C on any cell. Many race packs get there with air and enough thermal mass for a short run; liquid buys margin at the cost of mass and complexity.',
        sources: ['fsae2024']
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'Six segments of twelve Energus Li2x8pVTC5AT cell modules, arranged to be "easily removable and serviceable".', source: 'columbiaEv21' },
      { team: 'Virginia Motorsports', text: '144 cells in eight segments of eighteen, with six thermistors per segment.', source: 'vmsBms' }
    ],
    labs: ['pack', 'assemblies'],
    inside: 'battery'
  },

  hvfuse: {
    plain: 'A one-shot safety link that melts if a short circuit drives far too much current.',
    rules: [
      R('EV.6.6.2', 'Rated for the highest system voltage, a continuous rating no higher than the part it protects, and an interrupt rating above the prospective short-circuit current.'),
      R('EV.5.4.1', 'At least one fuse per container.')
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
        sources: ['fsae2024']
      }
    ]
  },

  air: {
    plain: 'Two heavy-duty switches, one on each battery terminal, that connect the pack to the car only while the safety loop is healthy.',
    rules: [
      R('EV.5.4.1', 'Two or more isolation relays per container.'),
      R('EV.5.4.2', 'Normally open, and they must open both poles.'),
      R('EV.7.2.2', 'When the shutdown circuit opens: current stops, and tractive voltage falls to Low Voltage within 5 seconds.')
    ],
    decisions: [
      {
        q: 'What kind of switch can break hundreds of volts DC?',
        options: [
          { name: 'Sealed DC contactor', pros: 'Built to stretch and extinguish a DC arc inside a sealed chamber.', cons: 'Large, costly, and the coil draws continuous low-voltage power.' },
          { name: 'Ordinary AC-rated relay', pros: 'Cheap and small.', cons: 'AC arcs die at each zero crossing. DC has no zero crossing, so the arc can sustain and destroy the relay.' },
          { name: 'Semiconductor switch', pros: 'No arc, very fast.', cons: 'No physical air gap when off, conducts heat while on, and tends to fail short.' }
        ],
        takeaway: 'Breaking DC is the hard part. A contactor rated for the full pack voltage and fault current is the only option that also leaves a real gap in the circuit.',
        principle: true
      },
      {
        q: 'Why one on each terminal instead of just one?',
        options: [
          { name: 'One relay', pros: 'Half the parts and half the coil power.', cons: 'If its contacts weld, the pack stays connected. The other pole is always live outside the container.' },
          { name: 'One per pole', pros: 'A single welded contact still leaves the circuit open. With both open, nothing outside the container is connected to the cells.', cons: 'More mass and cost.' }
        ],
        takeaway: 'Normally-open matters just as much: lose low-voltage power for any reason and the springs open the contacts.',
        sources: ['fsae2024']
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
        takeaway: 'Good designs keep four things separate: the command, the coil current, the auxiliary contact, and the measured bus voltage. Disagreement between any two is a fault worth reporting.',
        principle: true
      }
    ]
  },

  precharge: {
    plain: 'A resistor and small relay that fill the inverter\'s capacitors slowly before the main relays close.',
    rules: [
      R('EV.5.6.1', 'Charge the intermediate circuit to at least 90% of pack voltage before closing the second isolation relay.'),
      R('EV.5.6.2', 'End of precharge is decided by voltage feedback or by a minimum time.'),
      R('EV.5.6.5', 'The precharge relay must be a mechanical type.')
    ],
    decisions: [
      {
        q: 'What resistance?',
        options: [
          { name: 'Low resistance', pros: 'Fast start-up.', cons: 'High peak current at the first instant (pack voltage ÷ R) and a large pulse of heat in the resistor.' },
          { name: 'High resistance', pros: 'Gentle on the resistor and relay.', cons: 'Slow. If anything on the bus draws current, the voltage may never reach 90%.' }
        ],
        takeaway: 'The voltage rises as 1 − e^(−t/RC). Reaching 90% takes about 2.3 time constants. The resistor absorbs the same energy the capacitors end up storing (½CV²) whatever its value, so it is sized for that energy pulse, not for continuous power.',
        sources: ['fsae2024']
      },
      {
        q: 'How do you decide precharge has finished?',
        options: [
          { name: 'Fixed timer', pros: 'No high-voltage measurement needed.', cons: 'Blind. A broken resistor or a shorted bus looks the same as success.' },
          { name: 'Voltage feedback', pros: 'Closes the main relay only when the bus has really reached the threshold, and can raise a timeout fault if it never does.', cons: 'Needs isolated measurement of bus voltage.' }
        ],
        takeaway: 'The rules allow either. Voltage feedback turns precharge from a delay into a check, which is why most inverters and BMS units report bus voltage.',
        sources: ['fsae2024']
      }
    ],
    labs: ['precharge']
  },

  dcLink: {
    plain: 'A bank of capacitors right at the inverter that supplies the fast current pulses the switches demand.',
    rules: [
      R('EV.7.2.2', 'After shutdown, tractive voltage must fall to Low Voltage within 5 seconds, so this bank needs a discharge path.'),
      R('EV.5.6.3', 'The discharge circuit must be active whenever the shutdown circuit is open.')
    ],
    decisions: [
      {
        q: 'Film or electrolytic capacitors?',
        options: [
          { name: 'Film', pros: 'Low internal resistance, handles high ripple current, long life.', cons: 'Less capacitance for the volume.' },
          { name: 'Aluminium electrolytic', pros: 'A lot of capacitance in a small, cheap can.', cons: 'Higher internal resistance means more heating. Life falls quickly with temperature. Individual cans are rated below typical traction voltages, so they must be stacked in series and balanced.' }
        ],
        takeaway: 'Traction inverters overwhelmingly use film capacitors. The job is carrying ripple current, not storing energy, and film does that with less heat.',
        principle: true
      }
    ],
    inside: 'inverter',
    labs: ['precharge']
  },

  inverter: {
    plain: 'The motor controller. It turns battery DC into three-phase current and controls how much torque the motor makes.',
    rules: [
      R('EV.3.3.1', 'Power drawn from the battery must not exceed 80 kW.'),
      R('EV.7.2.2', 'When the shutdown circuit opens the motors must spin free with no torque applied.')
    ],
    decisions: [
      {
        q: 'Buy an inverter or design one?',
        options: [
          { name: 'Commercial unit', pros: 'Proven power stage and protection, documented CAN interface, support.', cons: 'Cost and mass. You work within its limits and its message set.' },
          { name: 'Team-built', pros: 'Sized exactly for the car. Enormous learning value.', cons: 'Power electronics fail destructively. A long, expensive road to something reliable.' }
        ],
        takeaway: 'Most teams buy the inverter and put their engineering effort into the control unit, battery and integration.',
        principle: true
      },
      {
        q: 'Silicon IGBT or silicon-carbide MOSFET switches?',
        options: [
          { name: 'Silicon IGBT', pros: 'Mature, rugged, lower cost.', cons: 'Loses more energy every time it switches, which limits switching frequency and adds heat.' },
          { name: 'Silicon-carbide MOSFET', pros: 'Much lower switching loss: higher efficiency, smaller cooling system.', cons: 'More expensive. Very fast voltage edges demand careful gate drive, layout and noise control.' }
        ],
        takeaway: 'Silicon carbide is the direction of travel for new designs; IGBT units remain common because they are proven and affordable.',
        principle: true
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'Cascadia Motion PM100DX, chosen for its "reliability".', source: 'columbiaEv21' },
      { team: 'lflaherty/ev-ecu', text: 'The first CAN bus on the ECU connector is reserved for an inverter using the Cascadia Motion protocol.', source: 'evEcu' }
    ],
    labs: ['powertrain', 'assemblies'],
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
        takeaway: 'At traction voltages the driver is a safety component. Two things it must guarantee: the upper and lower switch of a leg are never on together (dead time), and a shorted switch is shut down faster than software could manage.',
        principle: true
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
        takeaway: 'Mass decides it for a race car: permanent-magnet machines dominate. The fact that a spinning magnet motor is a generator is something the rest of the high-voltage system has to be designed around.',
        principle: true
      },
      {
        q: 'One motor or one per wheel?',
        options: [
          { name: 'Single motor and differential', pros: 'One inverter, simple control, less to go wrong.', cons: 'No independent control of wheel torque.' },
          { name: 'Hub or per-wheel motors', pros: 'Torque vectoring and regeneration at every wheel.', cons: 'Several inverters, more unsprung mass, far more software.' }
        ],
        takeaway: 'Per-wheel drive is faster when it works. A single motor is where almost every team starts.',
        principle: true
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'Emrax 208 motor, with the gear ratio to the differential chosen from battery voltage and target top speed.', source: 'columbiaEv21' }
    ],
    labs: ['powertrain', 'assemblies'],
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
        takeaway: 'Traction motors commonly use resolvers for ruggedness. Whatever is used, the angle offset between sensor and rotor must be calibrated: an error wastes current and can reverse torque.',
        principle: true
      }
    ],
    inside: 'motor'
  },

  cellmonitor: {
    plain: 'A chip on each battery segment that measures every cell and passes the numbers along an isolated link.',
    rules: [
      R('EV.7.4.1', 'The cell voltage of every cell must be measured (one measurement covers cells wired directly in parallel).'),
      R('EV.7.5.5', 'For lithium cells, the temperature of at least 20% of cells must be monitored, evenly distributed.')
    ],
    decisions: [
      {
        q: 'Which monitor IC?',
        options: [
          { name: 'ADBMS6830B (Analog Devices)', pros: '16 cells per chip, ±1.8 mV lifetime error, 2 Mbit/s isoSPI. A second, independent ADC on every cell for cross-checking. Read data carries a 10-bit error check plus a command counter.', cons: 'Newer part, so less example code in circulation.' },
          { name: 'LTC6811 (Analog Devices)', pros: '12 cells per chip, 1.2 mV total error, 1 Mbit/s isoSPI over up to 100 m of cable. Years of public example code.', cons: 'Older generation with fewer channels and no redundant measurement path.' },
          { name: 'BQ79616-Q1 (Texas Instruments)', pros: '6 to 16 cells per chip, ±1.5 mV, isolated daisy chain with an optional ring so one broken link is survivable. Up to 35 devices in a stack.', cons: 'Different protocol and tooling; the host talks through a separate bridge chip (BQ79600).' }
        ],
        takeaway: 'All three satisfy "measure every cell". What tips it: how many cells are in each segment compared with channels per chip, which isolation link you want to debug, and how much working driver code already exists.',
        sources: ['adbms6830b', 'ltc6811', 'bq79616']
      },
      {
        q: 'How do boards at different voltages talk to one controller?',
        options: [
          { name: 'Isolated daisy chain (isoSPI and similar)', pros: 'Two wires through a small transformer between boards. One microcontroller runs the whole pack.', cons: 'A break in the chain cuts off everything beyond it, unless the chain can be driven from both ends.' },
          { name: 'A microcontroller per segment on isolated CAN', pros: 'Each segment works independently and can be tested by itself.', cons: 'More parts, more firmware images, more to keep in sync.' }
        ],
        takeaway: 'The link exists because each segment sits at a different voltage. Plain SPI would connect those voltages together; an isolated link carries data while blocking the DC.',
        principle: true
      },
      {
        q: 'Passive or active balancing?',
        options: [
          { name: 'Passive (bleed resistor)', pros: 'Built into the monitor IC: the ADBMS6830B switches up to 300 mA per cell. Simple and reliable.', cons: 'Burns the excess as heat. Only moves cells downward.' },
          { name: 'Active (charge shuttling)', pros: 'Moves energy from high cells to low ones instead of wasting it.', cons: 'Extra converters, cost and failure modes.' }
        ],
        takeaway: 'For a small, well-matched race pack that is balanced during charging, passive is enough and comes free with the chip.',
        sources: ['adbms6830b']
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
      R('EV.7.3.5', 'On a fault the AMS must open the shutdown circuit and light its indicator.'),
      R('EV.7.2.3', 'If the AMS, IMD or BSPD opens the shutdown circuit, the car stays disabled until someone resets it at the vehicle.'),
      R('EV.7.5.2', 'Cell temperature below the lower of the datasheet maximum and 60 °C.')
    ],
    decisions: [
      {
        q: 'Buy a BMS or build one?',
        options: [
          { name: 'Commercial unit', pros: 'Works out of the box with configuration software. State-of-charge estimation and charger control included.', cons: 'Fixed wiring scheme and message set. Little insight into what it is doing.' },
          { name: 'Team-built on a monitor IC', pros: 'Fits the pack exactly. The team owns every threshold and every line of code.', cons: 'A safety-critical embedded project in its own right.' }
        ],
        takeaway: 'Both are common. A commercial unit gets a car running; a custom one is usually justified by packaging, mass, or the wish to understand it fully.',
        principle: true
      },
      {
        q: 'How should a battery fault stop the car?',
        options: [
          { name: 'Send a CAN message and let the VCU react', pros: 'Easy. The VCU can cut torque smoothly.', cons: 'Depends on two controllers, a bus and their software all working at the moment something is already wrong.' },
          { name: 'Open the shutdown circuit directly', pros: 'A dedicated output drops the isolation relays regardless of any other controller.', cons: 'Abrupt: the car loses drive immediately.' }
        ],
        takeaway: 'Do both. The hardwired output is the protection and is required; the CAN message is the explanation. The fault must latch so that a problem which clears by itself cannot quietly come back.',
        sources: ['fsae2024', 'vmsBms']
      },
      {
        q: 'How do you estimate state of charge?',
        options: [
          { name: 'From voltage', pros: 'Simple, no current sensor needed.', cons: 'Voltage sags under load and recovers at rest, so the estimate swings while driving.' },
          { name: 'Counting current in and out', pros: 'Smooth and accurate over a run.', cons: 'Sensor offset accumulates. Needs a known starting point.' },
          { name: 'Model-based (for example a Kalman filter)', pros: 'Combines both and corrects drift.', cons: 'Needs a characterised cell model and more processing.' }
        ],
        takeaway: 'Counting current, corrected by voltage whenever the pack has rested, is the usual practical compromise.',
        principle: true
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
      R('EV.3.2.3', 'All tractive power must flow through the organiser\'s energy meter, which enforces the 80 kW limit.')
    ],
    decisions: [
      {
        q: 'Shunt or magnetic sensor?',
        options: [
          { name: 'Shunt resistor', pros: 'Accurate and linear with very low drift: good for counting charge.', cons: 'Sits at pack voltage, so it needs an isolated amplifier. Dissipates heat.' },
          { name: 'Open-loop Hall sensor', pros: 'Clips around the cable. Isolated by nature, cheap, no added resistance.', cons: 'Offset drifts with temperature, which hurts accuracy at low current.' },
          { name: 'Closed-loop or fluxgate sensor', pros: 'Isolated and accurate.', cons: 'Larger, more expensive, draws more supply current.' }
        ],
        takeaway: 'The use decides: state-of-charge estimation needs low offset (shunt or fluxgate); protection and the brake plausibility device only need a fast, isolated signal (Hall is fine).',
        principle: true
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
      R('EV.4.7', 'If the brakes are on while the accelerator is past 25%, motor power is cut and stays off until the pedal is below 5%.'),
      R('EV.9.4.2', 'Ready-to-drive needs the tractive system active, the brake pedal held and a deliberate driver action.')
    ],
    decisions: [
      {
        q: 'Which microcontroller?',
        options: [
          { name: 'STM32', pros: 'CAN controllers, ADCs and timers on one chip. Large ecosystem and good RTOS support.', cons: 'The vendor configuration layer takes time to learn.' },
          { name: 'Teensy 4.1 (NXP i.MX RT)', pros: 'Very fast and quick to get running with Arduino-style tooling.', cons: 'A hobbyist board form factor. Fewer production-style debugging tools.' },
          { name: 'Control-oriented MCU (for example TI C2000)', pros: 'Peripherals designed for control loops and power electronics.', cons: 'Smaller community and steeper tooling.' }
        ],
        takeaway: 'A control unit needs CAN, a handful of analogue inputs and timers. Almost any modern 32-bit MCU has the performance; teams choose on peripherals, tools and what the last generation of students already knew.',
        principle: true
      },
      {
        q: 'Super-loop or real-time operating system?',
        options: [
          { name: 'Single loop', pros: 'Easy to reason about. No shared-data hazards.', cons: 'Every job waits for every other. Timing drifts as features are added.' },
          { name: 'RTOS tasks', pros: 'Each job gets its own period and priority. Safety checks can pre-empt logging.', cons: 'Shared data needs protection. Priority mistakes cause subtle bugs.' }
        ],
        takeaway: 'Once the firmware has several jobs with different deadlines (pedal sampling, CAN, state machine, logging) an RTOS pays for itself.',
        principle: true
      },
      {
        q: 'How should the code be layered?',
        options: [
          { name: 'Everything in one module', pros: 'Fast to write.', cons: 'Changing the inverter means rewriting the vehicle logic.' },
          { name: 'Vehicle logic → device drivers → peripheral drivers', pros: 'Vehicle logic speaks in torque and states; a device driver translates to one product\'s CAN messages; a peripheral driver owns the registers.', cons: 'More files and interfaces up front.' }
        ],
        takeaway: 'Layering is what lets you test vehicle logic on a PC and swap an inverter without touching the state machine.',
        principle: true
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
      R('T.4.2.3', 'The sensors must have different transfer functions, so a short between them is detectable.'),
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
        takeaway: 'Redundancy only helps if the two channels cannot fail in the same way. The rules require electrically separate sensors with different curves; giving each its own supply and ground goes one step further.',
        sources: ['fsae2024']
      },
      {
        q: 'Why not use the full 0 to 5 V range?',
        options: [
          { name: 'Use the whole range', pros: 'Maximum resolution.', cons: 'A broken wire (0 V) or a short to supply (5 V) looks like a valid pedal position.' },
          { name: 'Keep clear of both rails', pros: 'Anything near 0 V or 5 V can only be a wiring fault.', cons: 'Slightly less resolution.' }
        ],
        takeaway: 'The rules give below 0.5 V or above 4.5 V as an example of out-of-range for an analogue sensor.',
        sources: ['fsae2024']
      },
      {
        q: 'Potentiometer or Hall-effect sensor?',
        options: [
          { name: 'Potentiometer', pros: 'Cheap and ratiometric.', cons: 'A sliding contact wears and gets noisy.' },
          { name: 'Hall-effect (contactless)', pros: 'No wear. Dual-output parts are widely available.', cons: 'Needs a magnet and a clean supply.' }
        ],
        takeaway: 'Contactless sensors are standard in road cars for exactly this job.',
        principle: true
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
      R('EV.7.1.1', 'In the loop: AMS, IMD, BSPD, interlocks, both master switches, the shutdown buttons, the brake over-travel switch and the inertia switch.'),
      R('EV.7.2.2', 'When it opens: current stops immediately, tractive voltage falls to Low Voltage within 5 s, motors spin free.'),
      R('EV.7.2.3', 'After an AMS, IMD or BSPD trip, only a manual reset at the car re-enables it.')
    ],
    decisions: [
      {
        q: 'Why a hardwired loop and not a software shutdown?',
        options: [
          { name: 'Software over CAN', pros: 'Flexible, and every event is logged.', cons: 'Works only if the sender, the bus, the receiver and all their code are healthy, at the very moment something has failed.' },
          { name: 'Series loop feeding the relay coils', pros: 'Opening any contact removes coil power. A cut wire, a pulled connector or a dead supply all fail to "off".', cons: 'Harder to diagnose: you know the loop is open, not where.' }
        ],
        takeaway: 'The safety function is the wire. Controllers watch the loop and report which element opened, but they are observers, not part of the path. That is also why the brake over-travel switch, BSPD and IMD may not use programmable logic.',
        sources: ['fsae2024']
      }
    ],
    labs: ['simulation']
  },

  imd: {
    plain: 'Constantly checks that the high-voltage system has not started leaking to the chassis.',
    rules: [
      R('EV.7.6.2', 'Must be a Bender IR155-3203 or IR155-3204, or an approved equivalent.'),
      R('EV.7.6.3', 'Response value: 500 Ω per volt or higher.'),
      R('EV.6.5.1', 'The tractive system and the grounded low-voltage system must be completely galvanically separated.')
    ],
    decisions: [
      {
        q: 'Why monitor insulation at all?',
        options: [
          { name: 'Ground one side of the battery (like a 12 V car)', pros: 'Simple, and a fault blows a fuse.', cons: 'Touching the other terminal and the chassis is a shock path at full pack voltage.' },
          { name: 'Float the battery and monitor it', pros: 'A single contact with either terminal completes no circuit. The first insulation failure is detected before a second one makes it dangerous.', cons: 'Needs a device that measures megohms on a live system.' }
        ],
        takeaway: 'A floating system is only safe while it stays floating. The IMD is what proves that, continuously. At 500 Ω per volt, a 600 V system must trip below 300 kΩ.',
        sources: ['fsae2024']
      },
      {
        q: 'Why this particular device?',
        options: [
          { name: 'Bender IR155-3203 / 3204', pros: 'Named in the rules. Monitors systems from 0 to 1000 V DC, measures 0 to 10 MΩ, runs from a 12 V or 24 V supply, self-tests automatically. Gives a simple OK/not-OK output plus a PWM signal encoding the measured resistance.', cons: 'The first measurement after power-up takes seconds, which start-up logic has to allow for.' },
          { name: 'Team-built monitor', pros: 'None that outweigh the risk.', cons: 'Would need approval as an equivalent. Not a place to innovate.' }
        ],
        takeaway: 'The OK output goes into the shutdown loop through a latch with no programmable logic. The PWM output is for the controller to log and display.',
        sources: ['fsae2024', 'ir155']
      }
    ],
    labs: ['simulation']
  },

  bspd: {
    plain: 'A small analogue circuit that cuts power if the car is braking hard and still drawing drive current.',
    rules: [
      R('EV.7.7.1', 'A standalone, non-programmable circuit.'),
      R('EV.7.7.2', 'Opens the shutdown circuit when hard braking and about 5 kW of motor power occur together; it may wait up to 0.5 s.'),
      R('EV.7.7.3', 'An open or shorted sensor input must also open the shutdown circuit.')
    ],
    decisions: [
      {
        q: 'The VCU already checks brake against throttle. Why a second device?',
        options: [
          { name: 'VCU software only', pros: 'No extra hardware.', cons: 'The fault being guarded against may be the VCU itself: a stuck torque command or a crashed task.' },
          { name: 'Independent comparators and a timer', pros: 'Shares nothing with the VCU: its own sensors in, a relay contact out. Simple enough to verify completely on a bench.', cons: 'Thresholds are set by resistors, so changing them means soldering.' }
        ],
        takeaway: 'It watches outcomes (brake pressure and battery current), not intentions. Whatever the software believes, if the car is braking hard and still pulling power, the loop opens.',
        sources: ['fsae2024']
      }
    ],
    labs: ['simulation']
  },

  tsal: {
    plain: 'The light on top of the roll hoop that tells everyone around the car whether high voltage is present.',
    rules: [
      R('EV.5.9.3', 'Red, flashing at 2 to 5 Hz, whenever voltage outside the container exceeds the High Voltage threshold.'),
      R('EV.5.9.4', 'Green, continuously lit, when it is below.'),
      R('EV.5.9.1', 'Hard-wired control only.'),
      R('T.9.1.1', 'High Voltage means more than 60 V DC or 25 V AC RMS.')
    ],
    decisions: [
      {
        q: 'Why is it driven by measured voltage instead of the controller\'s state?',
        options: [
          { name: 'Driven by VCU state', pros: 'One GPIO.', cons: 'Shows what the software thinks. After a relay opens, the capacitors can still hold a dangerous voltage for seconds.' },
          { name: 'Driven by a hardwired voltage detector', pros: 'Shows what is physically there, including stored charge and a welded relay.', cons: 'Needs an isolated detection circuit on the high-voltage bus.' }
        ],
        takeaway: 'The light is for marshals and team members deciding whether to touch the car. It has to tell the truth even when every controller is off.',
        sources: ['fsae2024']
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
        principle: true
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
        principle: true
      },
      {
        q: 'What should happen at bus-off?',
        options: [
          { name: 'Recover automatically and carry on', pros: 'Rides through a brief disturbance.', cons: 'Can hide a real wiring fault and keep disturbing the bus.' },
          { name: 'Treat as a fault and recover deliberately', pros: 'The vehicle state machine knows communication was lost and can respond safely.', cons: 'More logic to write.' }
        ],
        takeaway: 'The controller counts its own transmit errors and removes itself from the bus when they pile up. Firmware should watch those counters; they are the earliest warning of a physical-layer problem.',
        principle: true
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
      R('EV.6.6.1', 'Every electrical system, low and high voltage, needs overcurrent protection.')
    ],
    decisions: [
      {
        q: '12 V or 24 V?',
        options: [
          { name: '12 V', pros: 'The widest choice of automotive pumps, fans, relays and sensors.', cons: 'Twice the current for the same power, so heavier wire and more voltage drop.' },
          { name: '24 V', pros: 'Half the current. Contactor coils and industrial parts are readily available.', cons: 'Fewer automotive accessories. Sensors still need a regulated 5 V rail.' }
        ],
        takeaway: 'Either works. What matters is that every load, including the isolation relay coils and the insulation monitor, is rated for the one you choose.',
        principle: true
      },
      {
        q: 'Fuses or electronic power switches?',
        options: [
          { name: 'Fuse box', pros: 'Simple, visible, cheap.', cons: 'No information: you find out a fuse blew when something stops.' },
          { name: 'Smart high-side switches (a power distribution module)', pros: 'Each output is switched and current-limited by a controller, which can report faults and shed loads.', cons: 'More design work, and it puts software in the supply path.' }
        ],
        takeaway: 'Whichever is used, check supply voltage first when several unrelated faults appear together. One controller browning out looks like a dozen separate problems.',
        principle: true
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
      R('EV.6.5.1', 'High-voltage and low-voltage systems must be completely galvanically separated, so this converter must be an isolated type.')
    ],
    decisions: [
      {
        q: 'Low-voltage battery alone, or add a DC/DC converter?',
        options: [
          { name: 'Battery only', pros: 'Simple and naturally isolated from the pack.', cons: 'Must be big enough for the whole event and charged between runs.' },
          { name: 'Battery plus isolated DC/DC', pros: 'A small battery starts the car; the converter carries pumps and fans once high voltage is on.', cons: 'Another high-voltage component to fuse, enclose and isolate.' }
        ],
        takeaway: 'A low-voltage battery is needed either way: something has to power the controllers and close the relays before any high voltage exists.',
        sources: ['fsae2024']
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'A 300 W cooling system fed by a DC/DC converter from the high-voltage pack.', source: 'columbiaEv21' }
    ]
  },

  sensors: {
    plain: 'The thermistors, pressure sensors and voltage taps that let the controllers see what is happening.',
    rules: [
      R('EV.7.5.5', 'Temperature of at least 20% of lithium cells must be monitored, evenly distributed.'),
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
        takeaway: 'Thermistors on the monitor IC are the norm because the measurement stays local to the segment and crosses the isolation barrier as data.',
        principle: true
      }
    ],
    cases: [
      { team: 'Virginia Motorsports', text: '48 thermistors, six per segment, read by the cell-monitor ICs.', source: 'vmsBms' }
    ]
  },

  cooling: {
    plain: 'Pump, radiator and fans that carry heat away from the motor, inverter and sometimes the battery.',
    rules: [
      R('EV.7.5.2', 'Cells must stay below 60 °C (or the datasheet limit if lower).')
    ],
    decisions: [
      {
        q: 'Air or liquid cooling for the motor and inverter?',
        options: [
          { name: 'Air', pros: 'No pump, hoses or coolant.', cons: 'Cannot remove enough heat from a compact high-power motor or inverter for long.' },
          { name: 'Liquid loop', pros: 'Moves kilowatts from a small surface to a radiator placed in clean airflow.', cons: 'Mass, leaks, and a pump that becomes a single point of failure.' }
        ],
        takeaway: 'Compact traction motors and inverters are almost always liquid cooled. The control question is what to do when cooling falls behind: reduce torque early and smoothly instead of tripping at the limit.',
        principle: true
      }
    ],
    cases: [
      { team: 'Columbia EV21', text: 'A 300 W liquid and air system intended to keep inverter, motor and batteries "well below the required 60C".', source: 'columbiaEv21' }
    ],
    labs: ['powertrain']
  },

  dashboard: {
    plain: 'What the driver sees and hears, and the logger that records everything for later.',
    rules: [
      R('EV.9.5.2', 'Ready-to-drive sound: continuous for 1 to 3 seconds, at least 80 dBA.'),
      R('EV.7.3.5', 'An AMS fault must light an indicator the driver can see.')
    ],
    decisions: [
      {
        q: 'Should fault lights go through the display software?',
        options: [
          { name: 'Draw them on the screen', pros: 'Flexible. No extra wiring.', cons: 'If the display or its CAN link fails, the warning disappears with it.' },
          { name: 'Dedicated lamps driven by the fault latch', pros: 'Stay lit whenever the latch is tripped, whatever the display is doing.', cons: 'A few more wires to the cockpit.' }
        ],
        takeaway: 'Use the screen for information and dedicated lamps for safety status. On the screen, show the age of each value: an old number that looks plausible is worse than a blank.',
        principle: true
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
    name: 'Tractive system active light (TSAL)',
    family: 'INDEPENDENT SAFETY',
    color: '#ef6f76',
    summary: 'A lamp on the roll hoop: green when the car is electrically safe, flashing red when high voltage is present outside the battery container.',
    how: 'A hardwired circuit senses the voltage on the tractive side of the isolation relays. Above the High Voltage threshold it flashes red; below, it shows steady green.',
    inputs: ['Tractive system voltage (isolated detection)', 'Low-voltage supply'],
    outputs: ['Red flashing or green steady light'],
    interfaces: ['Isolated high-voltage detection circuit', 'Low-voltage lamp driver'],
    failures: ['Lamp or driver failure', 'Detection circuit fault', 'Wrong state shown after a relay weld'],
    design: 'The detection must sit on the vehicle side of the isolation relays, so it reports what is actually reachable outside the container.',
    reference: 'Requirements quoted from Formula SAE Rules 2024.'
  }
];
