# Electric Race Car Systems Explorer

An educational, browser-based reference model for exploring an electric Formula Student vehicle as a complete system.

## Features
- Interactive 3D vehicle model with selectable subsystem modules.
- Component explorer for signals, interfaces and engineering checks.
- Architecture view separating energy, control/network, and monitoring/safety paths.
- Accelerator-to-wheel scenario with adjustable synthetic pedal input and telemetry.
- Fault walkthroughs for cell overvoltage, BMS CAN timeout and accelerator sensor disagreement.
- Illustrative CAN frame inspector and responsive desktop/mobile layout.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Engineering scope and safety

This is a **synthesized educational reference architecture**. It is not the San José State University Spartan Racing wiring diagram, bill of materials, firmware, calibration, DBC, or validated safety concept. CAN IDs, payloads, bus speed, current values and thresholds are synthetic illustrations. Replace them only with team-approved documentation and verify every interface against the team's current design.

The simulation is not safety-certified and must not be connected to or used to control a real vehicle. It does not implement real shutdown circuit behavior, HV controls, inverter control, battery protection or vehicle safety logic.

## References
- Formula SAE official rules and technical resources: https://www.fsaeonline.com/cdsweb/gen/DocumentResources.aspx
- python-can documentation: https://python-can.readthedocs.io/
- cantools documentation: https://cantools.readthedocs.io/
- Three.js documentation: https://threejs.org/docs/
- React Three Fiber documentation: https://r3f.docs.pmnd.rs/

These references are starting points, not claims that the prototype implements a compliant vehicle design. University team repositories should be reviewed individually and labeled as reference implementations, never assumed to describe SJSU's vehicle.
