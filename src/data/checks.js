// "Check yourself" questions, two or more per part. Every answer is stated on
// that part's own page (rules, decisions, firmware or cases), so a student who
// has read the page can answer, and the explanation points back to it.
const Q = (q, options, answer, why) => ({ q, options, answer, why });

export const checks = {
  cell: [
    Q('A Molicel P45B charges to 4.2 V. What is the most cells you can put in series under the 600 V limit?',
      ['120', '142', '150', '166'], 1, '142 × 4.2 V = 596.4 V. One more cell gives 600.6 V, which is over the limit.'),
    Q('Why do most race teams pick NMC/NCA power cells over LFP?',
      ['LFP cannot be used in Formula SAE', 'Higher energy and power for the mass, which matters more than cycle life over short events', 'NMC has a flatter voltage curve, so state of charge is easier', 'NMC is more thermally stable'], 1,
      'The trade is mass and peak power against cycle life and thermal margin. LFP is legal; it is just heavier for the same energy.'),
    Q('A P45B has about 15 mΩ DC resistance. Roughly how much heat does one cell make at its 45 A rating?', ['0.7 W', '3 W', '30 W', '300 W'], 2, '45² × 0.015 ≈ 30 W, which is why the data sheet quotes the 45 A rating with an 80 °C cut-off.'),
    Q('Within what cell temperature range does the P45B data sheet allow charging?', ['−40 to 60 °C', '0 to 60 °C', '10 to 45 °C', '0 to 80 °C'], 1, 'Discharge is allowed from −40 °C, but charging only from 0 °C.')
  ],
  accumulator: [
    Q('Which three limits apply to each module in the 2027 rules?',
      ['600 V, 80 kW, 12 kg', '120 V, 6 MJ, 12 kg', '60 V, 6 MJ, 20 kg', '120 V, 80 kW, 6 MJ'], 1, 'EV.5.1.1: 120 V DC static voltage, 6 MJ, 12 kg.'),
    Q('How does the rule define the energy of a module?',
      ['Nominal voltage × nominal capacity', 'Maximum stack voltage × nominal capacity', 'Measured energy from a full discharge', 'Maximum voltage × maximum current × 1 hour'], 1, 'EV.5.1.1 uses maximum stack voltage times nominal capacity, so it is slightly conservative.'),
    Q('What did older rulebooks and most team write-ups call a module?', ['A cell group', 'A stack', 'A segment', 'A string'], 2, 'Segment. Accumulator, AMS and AIR were renamed at the same time.')
  ],
  hvfuse: [
    Q('Which fault is the fuse there for, that neither the relays nor the BMS can handle?',
      ['A slow overcharge', 'A short circuit current larger than a relay can break', 'An insulation fault to chassis', 'A cell over-temperature'], 1,
      'A dead short can weld relay contacts and is too fast for sensors and software. The fuse is passive.'),
    Q('Besides amps, which two ratings must a tractive-system fuse have?',
      ['Colour and size', 'A DC voltage rating at or above system voltage, and an interrupt rating above the short-circuit current', 'An AC voltage rating and a temperature rating', 'A self-reset time and a trip curve'], 1, 'EV.7.6.2.')
  ],
  air: [
    Q('Why are there two isolation relays rather than one?',
      ['To share the current', 'So that one welded contact still leaves the circuit open, and both poles are disconnected', 'Because one is for charging', 'To halve the coil power'], 1, 'EV.5.4.2 requires normally-open relays on both poles.'),
    Q('Why is breaking DC harder than breaking AC?',
      ['DC is always at higher voltage', 'DC has no zero crossing, so an arc can sustain itself', 'DC current is always larger', 'AC relays are sealed'], 1, 'An AC arc dies at each zero crossing; a DC contactor must stretch and extinguish it.')
  ],
  contactorCoil: [
    Q('Which single signal proves the main contacts are open and clean?',
      ['The command output', 'The auxiliary contact', 'The coil current', 'None on its own: compare command, coil current, auxiliary contact and measured bus voltage'], 3,
      'An auxiliary contact shows the mechanism moved; it does not prove the main contacts are not welded.'),
    Q('How long may a capacitor hold the isolation relays closed after the shutdown circuit opens?', ['50 ms', '250 ms', '1 s', '5 s'], 1, 'EV.5.4.5.')
  ],
  precharge: [
    Q('To what level must precharge raise the intermediate circuit before the second relay closes?', ['50%', '80%', '90%', '100%'], 2, 'EV.5.6.1.'),
    Q('Under the 2027 rules, how must the end of precharge be decided?',
      ['By a fixed timer', 'By measured intermediate-circuit voltage (feedback)', 'By the driver', 'By a PTC thermistor'], 1, 'EV.5.6.2. A timer alone is no longer enough, and PTC devices are banned by EV.5.6.4.'),
    Q('Roughly how many RC time constants does it take to reach 90%?', ['0.7', '1', '2.3', '5'], 2, '1 − e^(−2.3) ≈ 0.90.')
  ],
  dcLink: [
    Q('Why do traction inverters use film rather than electrolytic DC-link capacitors?',
      ['Film stores more energy per litre', 'The job is carrying ripple current, and film does it with less heating and a higher voltage rating', 'Electrolytics are banned', 'Film is cheaper per microfarad'], 1,
      'Cornell Dubilier credits film with about three times the ripple current capability and twice the voltage capability.'),
    Q('Within what time must tractive voltage fall to Low Voltage after the shutdown circuit opens?', ['1 s', '5 s', '15 s', '60 s'], 1, 'EV.8.2.2.')
  ],
  inverter: [
    Q('In the ev-ecu driver, what does a torque field value of 125 in the 0x0C0 command mean?', ['125 Nm', '12.5 Nm', '1.25 Nm', '125% of maximum'], 1, 'Torque is sent in tenths of a newton-metre.'),
    Q('What does USC send when the car is not in drive or the inverter status is stale?',
      ['Nothing, to save bus load', 'An all-zero free-roll command', 'The last torque value', 'A discharge command'], 1, 'Silence is not used: the inverter treats a missing command as a fault too.'),
    Q('After how long does USC treat the inverter fault status as stale?', ['10 ms', '100 ms', '250 ms', '1 s'], 2, 'CAN_INVERTER_FAULT_STATUS_TIMEOUT_MS is 250.')
  ],
  gateDriver: [
    Q('What does desaturation (DESAT) detection protect against?',
      ['Low gate voltage', 'A short circuit through the switch while it is on', 'Overheating of the motor', 'Loss of CAN'], 1, 'It turns the switch off within hundreds of nanoseconds, faster than any software.'),
    Q('What must the driver guarantee about the two switches in one leg?',
      ['They switch at the same instant', 'They are never on together (dead time)', 'They share a gate resistor', 'They use the same supply'], 1, 'Both on at once is shoot-through: a short across the DC link.')
  ],
  motor: [
    Q('Why must the high-voltage system be designed around a permanent-magnet motor even when the inverter is off?',
      ['It draws current from the pack', 'A spinning PM motor generates voltage', 'Its magnets attract the chassis', 'It needs precharge'], 1, 'Spinning magnets induce voltage in the windings whatever the inverter is doing.'),
    Q('What limits an interior permanent-magnet motor\'s torque under heavy overload, according to the comparison study?',
      ['Rotor copper losses', 'Magnet demagnetisation', 'Bearing friction', 'Resolver accuracy'], 1, 'Induction machines do not have this limit, which is part of their trade-off.')
  ],
  resolver: [
    Q('What happens if the angle offset between the resolver and the rotor is wrong?',
      ['Nothing, the inverter adapts', 'High current for little torque, or torque in the wrong direction', 'The motor runs faster', 'The resolver overheats'], 1, 'Field-oriented control needs the true electrical angle.'),
    Q('What does a resolver-to-digital converter such as the AD2S1210 provide besides the angle?',
      ['The motor temperature', 'The excitation signal and detection of loss or degradation of the resolver signals', 'The DC bus voltage', 'Torque estimates'], 1, 'It generates the excitation and flags signal faults.')
  ],
  cellmonitor: [
    Q('What does the LTC6811 return for a cleared cell-voltage register?', ['0x0000', '0x8000', '0xFFFF', '0x80E8'], 2, '0xFFFF means "no data" on the LTC6811; on the ADBMS6830B it is 0x8000.'),
    Q('Which 2027 rule makes an isolated link between monitor boards mandatory?',
      ['EV.8.3.2: galvanic isolation at every module-to-module boundary', 'EV.3.3.1', 'T.4.2.4', 'EV.5.4.5'], 0, 'Each module sits at a different voltage.'),
    Q('An LTC6811 register reads 0x80E8. What cell voltage is that?', ['0.33 V', '3.30 V', '3.29 V', '33.0 V'], 1, '0x80E8 = 33 000 × 100 µV = 3.3000 V.')
  ],
  bms: [
    Q('Which of these is listed in the rules as a fault the BMS must act on?',
      ['A missing or interrupted measurement', 'Low state of charge', 'A slow CAN bus', 'High pack current'], 0, 'EV.8.3.4(d). Keeping the last value silently breaks the rule.'),
    Q('After the BMS opens the shutdown circuit, who can reset it?',
      ['The driver, with the dashboard button', 'The BMS, once the cell recovers', 'Only a person directly at the vehicle', 'Anyone, by cycling the master switch'], 2, 'EV.8.2.3.'),
    Q('In the Virginia Motorsports BMS, which task has the highest priority?',
      ['Slow telemetry', 'Charger housekeeping', 'The fault handler and fault CAN frame', 'Data acquisition'], 2, 'Priority follows consequence.')
  ],
  packcurrent: [
    Q('For state-of-charge estimation, which sensor property matters most?', ['Bandwidth', 'Low offset and offset drift', 'Isolation voltage', 'Price'], 1, 'An offset integrates into a growing error when you count charge.'),
    Q('Over what windows does the energy meter judge a power violation?',
      ['Any single sample', '100 ms continuously, or a 500 ms moving average', '1 s average', 'The whole lap'], 1, 'EV.3.4.1.')
  ],
  vcu: [
    Q('When does the APPS/brake plausibility check cut motor power?',
      ['Brake on and accelerator over 25% travel', 'Brake on and accelerator over 5%', 'Any brake application', 'Accelerator over 90%'], 0, 'EV.4.7.1 and EV.4.7.2. Power stays off until the pedal is back below 5%.'),
    Q('In comma.ai\'s safety firmware, what happens to a torque command that breaks the rate limit?',
      ['It is reduced to the nearest allowed value', 'It is blocked, and the firmware\'s memory of the last torque resets to zero', 'It is delayed by one frame', 'It is logged and sent anyway'], 1, 'The gate never edits a command. The main computer must clamp its own commands; the firmware only refuses.'),
    Q('What three conditions are needed to enter Ready to Drive?',
      ['Tractive system active, brake pressed and held, and a manual driver action', 'Low voltage on and a CAN heartbeat', 'Pedal at 0% and the precharge done', 'A green status light and the master switch'], 0, 'EV.10.6.2.')
  ],
  apps: [
    Q('How far apart must the two pedal sensors be before it counts as an implausibility?', ['5% of travel', '10% of travel', '25% of travel', '50% of travel'], 1, 'T.4.2.4. More than 10% for more than 100 ms must cut power (T.4.2.5).'),
    Q('Why must the two sensors have different transfer functions?',
      ['To double the resolution', 'So a short between the two signal wires gives a pair of values that matches no real pedal position', 'To use different ADCs', 'Because they come from different suppliers'], 1, 'Identical curves would agree perfectly when shorted together.')
  ],
  shutdown: [
    Q('What actually carries the current that holds the isolation relays closed?', ['The VCU output', 'The shutdown circuit itself', 'A CAN message', 'The BMS'], 1, 'EV.8.1.2.'),
    Q('Which devices must each have a completely independent way to open the loop?', ['VCU, dashboard, inverter', 'BMS, IMD, BSPD', 'TSMS, GLVMS, BOTS', 'Fuse, relays, precharge'], 1, 'EV.8.1.5.')
  ],
  imd: [
    Q('At 500 Ω per volt, below what insulation resistance must a 600 V system trip?', ['30 kΩ', '300 kΩ', '3 MΩ', '500 kΩ'], 1, '600 × 500 = 300 000 Ω.'),
    Q('Which IMD models are allowed in 2027?', ['Any model', 'Only the Bender IR155', 'Approved models listed in the Rules FAQ', 'Team-built devices'], 2, 'EV.8.6.2.')
  ],
  bspd: [
    Q('When does the BSPD open the shutdown circuit?',
      ['Any time the brake is pressed', 'Hard braking together with current equal to 5 kW at nominal voltage, for more than 0.5 s', 'Throttle over 25%', 'When the VCU asks it to'], 1, 'EV.8.7.2.'),
    Q('Why is the BSPD separate from the VCU\'s own pedal check?',
      ['It is cheaper', 'The fault being guarded against may be the VCU itself', 'It is faster at logging', 'It replaces the VCU check'], 1, 'It must be standalone and non-programmable (EV.8.7.1).')
  ],
  tsal: [
    Q('What does a flashing amber Ready to Move Light tell people around the car?',
      ['The BMS has tripped', 'High voltage (60 V or more) is present outside the battery container', 'The car is charging', 'The lamp check is running'], 1, 'EV.6.2.7.'),
    Q('What may software control on these lights?', ['Everything', 'Only the lamp check', 'The amber light', 'The red status light'], 1, 'EV.6.2.6 forbids software control of the voltage light; EV.6.3.1 allows it for the lamp check.')
  ],
  can: [
    Q('How does CAN decide which node transmits when two start at once?',
      ['Round robin', 'By identifier, without losing data', 'The faster node wins', 'Both retry after a random delay'], 1, 'Bitwise arbitration on the identifier.'),
    Q('In the GM battery DBC, Battery_Module_1 carries only three cell voltages. How does one identifier cover 24 cells?',
      ['It is sent at 8 times the rate', 'A 3-bit bank number selects which three cells are in the frame (multiplexing)', 'Each cell gets its own identifier', 'CAN FD carries 64 bytes'], 1, 'The receiver must read the bank number before trusting the voltages.'),
    Q('A frame arrives with identifier 0x0A7 and eight bytes. What do you need to turn it into volts?',
      ['Nothing, CAN frames are self-describing', 'The message definition: bit positions, byte order, scale and offset, usually from a DBC', 'The bus speed', 'The sender\'s serial number'], 1, 'An identifier and eight bytes mean nothing without the database.')
  ],
  cancontroller: [
    Q('When does a CAN controller go bus-off?', ['Receive error counter over 96', 'Transmit error counter over 255', 'After one CRC error', 'After 128 recessive bits'], 1, 'Bosch CAN 2.0 fault confinement.'),
    Q('What is the standard pattern for received frames?',
      ['Poll in the main loop', 'Interrupt copies the frame into a queue; a task decodes it', 'Decode inside the interrupt', 'Drop frames until the task is ready'], 1, 'The interrupt only moves bytes; tasks do the thinking.')
  ],
  cantransceiver: [
    Q('A board "has no CAN" but the firmware looks correct. What transceiver pin is a classic culprit?', ['TXD', 'A floating standby pin', 'VCC', 'CANH'], 1, 'If standby is not driven, the transceiver may stay off the bus.'),
    Q('What does an isolated transceiver let you do?', ['Run CAN faster', 'Join a node on a different ground to the bus safely', 'Drop the termination', 'Use one wire'], 1, 'It needs its own isolated supply on the bus side.'),
    Q('Where should the 120 Ω termination resistors go?', ['At every node', 'At the two physical ends of the cable', 'Only at the VCU', 'Anywhere, as long as there are two'], 1, 'Termination belongs at the two physical ends of the trunk, and nowhere else.')
  ],
  lv: [
    Q('What must the low-voltage system be able to do according to EV.4.4.1?',
      ['Charge the tractive battery', 'Operate with the tractive battery pack removed', 'Run above 60 V', 'Power the motor'], 1, 'It is grounded to the chassis and independent of the pack.'),
    Q('Several unrelated faults appear together. What should you check first?', ['The DBC file', 'Supply voltage and ground', 'The motor temperature', 'The pedal calibration'], 1, 'One controller browning out looks like a dozen separate problems.')
  ],
  dcdc: [
    Q('Why must the HV-to-LV converter be an isolated type?',
      ['For efficiency', 'The tractive and low-voltage systems must be completely galvanically separated', 'To reduce noise', 'To allow regeneration'], 1, 'EV.7.5.1.'),
    Q('Why is a low-voltage battery still needed if you fit a DC/DC converter?',
      ['It is not needed', 'Something must power the controllers and close the relays before any high voltage exists', 'For the dashboard only', 'To store regenerated energy'], 1, 'The DC/DC converter only works once high voltage is on.')
  ],
  sensors: [
    Q('What fraction of lithium cells must have their temperature monitored at minimum?', ['5%', '10%', '20%', '100%'], 2, 'EV.8.5.5, equally distributed. Every cell is recommended.'),
    Q('Where does the rule require a cell temperature to be measured?',
      ['Anywhere on the cell can', 'At the positive terminal', 'At the negative terminal, or on its busbar within 10 mm', 'On the module housing'], 2, 'EV.8.5.3 and EV.8.5.4.'),
    Q('An NTC reads as the very top of its resistance table. What is the likeliest explanation in a running car?',
      ['The cell is at −40 °C', 'The thermistor or its wiring is open', 'The cell is overheating', 'The ADC is saturated by a hot cell'], 1, 'Physically implausible readings should be treated as sensor faults.')
  ],
  cooling: [
    Q('What divider does USC\'s cooling task use to turn ADC volts into thermistor ohms?',
      ['R = 10000 × V / 5', 'R = 14666 × V / (5 − V)', 'R = 5 / V', 'R = 14666 / V'], 1, 'The thermistor is the lower leg of a divider from 5 V with a 14 666 Ω upper resistor.'),
    Q('According to the EMRAX 208 data sheet, what does liquid cooling change?',
      ['The peak power', 'The continuous power (33 kW air, 47 kW liquid, 52 kW combined)', 'The maximum speed', 'The voltage rating'], 1, 'Peak stays 86 kW; continuous power depends on how fast heat is removed.'),
    Q('What is the better control response when cooling falls behind?',
      ['Trip the car at the limit', 'Reduce torque early and smoothly', 'Raise the pump voltage above rating', 'Ignore it until the next stop'], 1, 'A soft loss of power is safer and easier to drive than a sudden cut.')
  ],
  dashboard: [
    Q('How must the BMS indicator be presented to the driver?',
      ['As an icon on the screen', 'As a red lamp marked "BMS", visible in bright sunlight', 'As a sound only', 'On the roll hoop'], 1, 'EV.8.3.6.'),
    Q('How long must the Ready to Drive sound last?', ['At least 0.5 s', '1 to 3 s', '5 s', 'Until the car moves'], 1, 'EV.10.7.2, at 80 dBA or more.')
  ]
};
