# EV Systems Explorer

Learn how an electric race car works the way you would learn anatomy: one system at a time.

Pick a system (high-voltage energy path, battery management, inverter and motor, vehicle control, communication buses, shutdown and safety, low-voltage power, cooling) and the rest of the car fades away. Each part explains what it does, **why it was designed that way and what the alternatives were**, what the rules require, how real teams did it, and where relevant what the firmware has to do.

Live: https://electric-race-car-systems.vercel.app/

> This is a teaching car assembled from public sources. It is not any team's vehicle and it is not a wiring, safety or rules-compliance reference. High-voltage systems can kill.

## How it is organised

| Area | What it is |
|---|---|
| **Explore** | 3D car with a system rail. Selecting a system isolates its parts, numbers them in learning order and draws its cable routes. Selecting a part opens five tabs: What it does, Why this design, Firmware (where relevant), Failures, Sources. |
| **Journeys** | One event followed across systems: switching the car on, pedal to torque, a cell over-voltage, an insulation fault. |
| **Labs** | Twelve hands-on exercises, each linked from the parts it teaches. Includes pack sizing against the rule limits and a cell-monitor frame builder (PEC15, command codes, register decoding). |
| **Glossary** | Abbreviations, also shown as hover tooltips throughout. |
| **Sources** | Every source, what it is used for, and when it was last checked. |

Every view has its own URL, for example `/system/bms/cellmonitor` or `/journey/pedal/4`.

## Where the facts come from

Three kinds of statement appear and each is labelled:

1. **Rules** are quoted with their rule number from *Formula SAE Rules 2027 V1.0* (1 September 2026). Rules change every season and the 2027 edition renumbered and renamed much of the EV section; read the edition for your event.
2. **Datasheet figures and team implementations** link to the document (Analog Devices, Texas Instruments, Bender, Molicel; Virginia Motorsports, Columbia, USC, lflaherty/ev-ecu).
3. **General engineering reasoning** is marked as such and quotes no part-specific numbers.

`test/content.test.js` fails the build if a rule, case study, design decision or firmware step has no registered source (or an explicit `principle: true`), or if any cross-reference is broken. `test/pec.test.js` checks the error-code maths against the LTC6811 data sheet's worked example, and that the bytes printed in the driver walkthrough are the computed ones.

## Adding or changing content

- `src/data/sources.js`: the source registry. Add the source first.
- `src/data/enrich.js`: per-part rules, design decisions, case studies and firmware walkthroughs.
- `src/data/base.js`: per-part summary, inputs, outputs, interfaces and failure modes.
- `src/data/systems.js`, `journeys.js`, `labs.js`, `glossary.js`: structure.
- `src/scene/layout.js`: where each part sits on the car and how cables are routed.
- `src/scene/CarScene.jsx`: the shape of each part and the car body.

Run `npm test` after any content change.

## Stack

React 18, Vite, React Three Fiber and Drei for the 3D scene, React Router for URLs, Lucide icons. Static site, no backend. The car is drawn from simple primitives in code; replacing it with a modelled GLB (for example from Blender) only needs meshes named by part id.

```
npm install
npm run dev      # local development
npm test         # content, error-code, pack and DBC tests
npm run build    # tests, then production build
```

## Known limits

- The 3D car is a schematic layout, not CAD, and cable routes are illustrative.
- Rule values are from the 2027 edition only (V1.0). Check the latest version and the Rules FAQ for your event.
- The simulators and calculators use illustrative values unless a source is named.
- The DBC decoder handles basic `BO_`/`SG_` definitions only; use a full library such as cantools for real work.
- The frame builder computes the 15-bit command check only, not the ADBMS6830B's 10-bit data check.
