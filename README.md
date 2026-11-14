# Electric Race Car Systems Explorer

A reference-based interactive engineering learning environment for understanding a Formula Student / electric race car electrical system from cell to wheel.

## Explorer features
- Interactive Three.js vehicle model: orbit, zoom, select assemblies, toggle HV power, control, CAN, sensing and shutdown wiring layers, and expand the accumulator.
- Component dossiers: system role, internal operation, inputs, outputs, electrical interfaces, failure modes and design considerations.
- Separate energy, control/network and independent safety architecture views.
- Live teaching simulation with dual APPS channels, brake input, BMS/IMD/BSPD/CAN fault injection, torque arbitration and event propagation.
- CAN lab using public identifiers from USC Formula SAE's VCU protocol header. Payload decoding is deliberately not invented where no DBC/protocol source is supplied.
- Reference library linking public team implementations, technical reports and official Formula SAE resources.

## Run locally
```bash
npm install
npm run dev
```
Build and preview:
```bash
npm run build
npm run preview
```

## Engineering provenance
This explorer synthesizes documented engineering patterns from multiple public projects. It does **not** claim that these projects share one architecture or that any describe San José State University's Spartan Racing vehicle.

- [lflaherty/ev-ecu](https://github.com/lflaherty/ev-ecu): FSAE-oriented ECU hardware, schematic, pinout, power distribution, shutdown circuit and layered firmware.
- [SCFormulaElectric/vcu_stm32](https://github.com/SCFormulaElectric/vcu_stm32): USC Formula SAE VCU firmware and public CAN protocol header.
- [Virginia Motorsports BMS project](https://chloegao.dev/projects/bms.html): cell monitor, isoSPI, data-integrity and fault-handling example.
- [Columbia University Formula Racing EV21 design report](https://studentresearch.engineering.columbia.edu/sites/studentresearch.engineering.columbia.edu/files/content/FINAL%20v2.pdf): accumulator, BMS, HV, LV and cooling design example.
- [Columbia FSAE software organization](https://github.com/columbia-fsae): ECU/VCU, DBC, SIL/HIL and controls resources.
- [Formula SAE official rules and resources](https://www.fsaeonline.com/cdsweb/gen/DocumentResources.aspx): normative event documents and inspection forms.

Reference-specific values (CAN bitrate, CAN identifiers, cell count, monitor IC, connector pinout, firmware timing) are labeled as that team's implementation. Synthetic model values are for learning only—not SJSU specifications, vehicle calibration or a validated safety design.

**Safety:** This is not a real-time controller, wiring design, HV work instruction, compliance assessment or safety-certified simulation. Never connect it to a vehicle or use it to make real vehicle control decisions. The shutdown path is a functional teaching abstraction; the actual circuit must be designed and reviewed against the current competition rules and the team's approved Electrical System Form.
