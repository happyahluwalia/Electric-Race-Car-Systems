# Electric Race Car Systems Explorer

**An open, reference-based learning environment for understanding how an electric race car works—from individual battery cells and sensors to embedded software, power electronics, the motor and the driven wheels.**

The goal is to make the electrical and control architecture of a Formula Student / Formula SAE electric vehicle understandable to **any student, educator or independent learner**. It is not tied to one university, team, vehicle, degree programme or level of prior experience.

The application combines an interactive 3D vehicle, component-level engineering dossiers, functional architecture, fault-injection exercises, CAN protocol exploration and links to real public engineering implementations. It helps learners move from *what is this component?* to *how is it wired, controlled, monitored, diagnosed and connected to the rest of the car?*

> **Important scope statement:** This is a synthetic teaching vehicle informed by multiple separately documented public projects. It is not a reconstruction of any particular team's vehicle, including San José State University's Spartan Racing car. It does not contain a team's private wiring, calibration, firmware, DBC, BOM or safety design.

## Who this is for

- **Beginners:** build a mental model of HV, LV, sensors, controllers, communication and the powertrain.
- **Electrical / electronics students:** understand cell monitoring, contactors, precharge, power distribution, isolation, signal conditioning and CAN physical layers.
- **Computer / embedded systems students:** follow ADC/GPIO acquisition, device drivers, RTOS tasks, state machines, watchdogs, CAN drivers, message decoding and fault handling.
- **Mechanical / mechatronics students:** connect electrical power and control to motor torque, drivetrain, thermal management and vehicle behaviour.
- **Formula Student / Formula SAE team members:** use public examples as design-study material, prepare better questions for subsystem owners and understand cross-subsystem dependencies.
- **Educators and mentors:** use the explorer as a visual teaching aid and starting point for design reviews or lab exercises.

No previous Formula Student experience is required. Learners should be able to use the app without knowing the architecture in advance.

## Learning outcomes

After working through the explorer, a learner should be able to:

1. Trace the **tractive-energy path**: accumulator → isolation / precharge → inverter DC link → semiconductor bridge → three-phase motor → drivetrain.
2. Explain the **low-voltage power tree** and why controller brownouts, grounding and fused distribution can cause apparently unrelated failures.
3. Describe a **battery measurement chain**: cell taps and thermistors → cell-monitor ICs → isolated communications → BMS master → limits, diagnostics and vehicle interface.
4. Distinguish **BMS measurement hardware, BMS supervisory logic and shutdown actuation**.
5. Explain how redundant accelerator sensors are acquired, checked for plausibility and converted into a bounded torque request.
6. Follow a **VCU software path** from input acquisition through state management and torque arbitration to the inverter command.
7. Distinguish an MCU's **CAN controller**, the external **CAN transceiver**, the physical bus and the higher-level message / signal definition in a DBC.
8. Read a CAN message definition without guessing at identifier meaning, bit positions, byte order, scaling, units or validity.
9. Explain why an **independent hardwired shutdown path** is different from a software command or CAN fault message.
10. Predict how faults propagate, identify what evidence is needed to diagnose them and understand why stale or invalid data must not be treated as healthy.
11. Compare real public implementations while recognizing that different teams make different architecture and component choices.

## Suggested learning path

The modules are connected. Work through them in order if you are new to the subject, or jump to a component if you already have context.

| Stage | Explore | Questions to answer |
|---|---|---|
| 1. Whole vehicle | 3D explorer and architecture | Where does energy flow? Where does information flow? What is the independent safety path? |
| 2. HV accumulator | Cells, modules, sensing, fuses, AIRs, precharge, DC link | What is energized, when, and how is inrush current controlled? |
| 3. BMS | Cell monitor, isoSPI, pack current, temperatures, BMS master | How does a raw cell voltage become a valid pack status or a fault? |
| 4. LV and sensing | LV battery, DC/DC, PDM, sensors and conditioning | What powers each ECU? What makes a measurement trustworthy? |
| 5. Embedded control | APPS, VCU, state machine, device drivers, watchdog | How does driver intent become a bounded command? |
| 6. CAN | Controller, transceiver, bus, frames and DBC | Which layer owns bit timing, physical signalling and signal scaling? |
| 7. Powertrain | Inverter, gate drivers, motor feedback, motor and cooling | How does DC become controlled phase current and shaft torque? |
| 8. Safety and diagnosis | IMD, BSPD, shutdown circuit, fault injection | Which faults inhibit torque, which open the shutdown path, and what evidence proves it? |
| 9. Integration | Trace an end-to-end scenario | Can you explain the full sequence and identify where to probe each interface? |

For each subsystem, try to explain its role, power source, inputs, outputs, physical/electrical interfaces, software owner (if any), failure modes and safe response.

## Application features

### 1. Interactive 3D vehicle explorer
- Orbit, pan and zoom around a schematic electric race-car chassis.
- Select assemblies to open their component dossiers.
- Toggle the HV power, control, CAN, sensor and safety overlays.
- Expand the accumulator to make its placement easier to inspect.
- Browse the component index and filter by subsystem family.

The 3D geometry is a **functional teaching layout**, not a dimensionally accurate CAD assembly or wiring harness drawing.

### 2. Component engineering dossiers
Each component dossier is organized around system role and operating principle, inputs and outputs, electrical/mechanical/communication interfaces, representative failure modes, engineering considerations and source provenance.

The component library covers the accumulator, BMS, cell-monitor chain, pack-current sensing, VCU, APPS, shutdown circuit, AIRs and contactor feedback, precharge, fuse, LV battery and DC/DC, IMD, BSPD, CAN controller and transceiver, DC link, inverter gate drivers, rotor feedback, motor, cooling and dashboard / logger.

### 3. Functional architecture
Separate views make it easier to reason about:
- **Tractive energy:** high-voltage power conversion and propulsion.
- **Control and information:** sensors, ECUs, software and communication.
- **Independent safety:** hardwired shutdown and the conditions that permit tractive-system operation.

A block diagram is a learning abstraction. Actual power, signal and safety paths must be confirmed against the chosen hardware and vehicle documentation.

### 4. Signal tracing
Follow three representative paths through the vehicle: accelerator pedal to motor torque, cell voltage to BMS fault reporting, and IMD trip to hardwired shutdown. Each stage explains its interface and responsibility and links to the relevant component dossier. These are functional learning sequences, not a pin-accurate wiring netlist.

### 5. Electrical net explorer
Inspect representative functional paths for tractive DC power, three-phase motor output, cell sensing, redundant APPS, BMS CAN, independent shutdown and low-voltage distribution. Select a path to inspect its source, destination, signal type, engineering role and limitations. This is not a connector/pin-level harness drawing.

### 6. 3D assembly explorer
Orbit and inspect schematic exploded assemblies for the accumulator, inverter and traction motor. Select cell groups, monitor PCB, busbars, DC-link capacitors, power modules, gate-driver PCB, rotor, stator and resolver. The main vehicle view also automatically focuses and zooms toward a selected component. Geometry is educational, not manufacturing CAD.

### 7. BMS deep dive
Change synthetic cell voltage and temperature, inject packet-integrity, freshness and open-wire faults, and inspect the chain from cell taps through monitor IC, isolated link, BMS master, fault policy and vehicle interface. Limits are illustrative.

### 8. VCU software workbench
Adjust redundant APPS channels, brake input, BMS permission, CAN freshness, shutdown continuity and inverter readiness. Follow the software pipeline from ADC/GPIO acquisition through validation, state machine, torque arbitration and CAN diagnostics. Task timing and torque are illustrative.

### 9. DBC decoder
Load or paste a DBC, select a message and decode raw hexadecimal bytes using signal start bit, length, byte order, signedness, factor and offset. The built-in sample is synthetic. The in-browser parser supports basic BO_/SG_ definitions, little-endian and Motorola big-endian bit extraction, signed two's-complement values, scaling and offsets. It does not implement multiplexing, value tables, extended-ID conventions, floating-point signals or all DBC attributes. A Node test suite covers the supported parsing and decoding cases. Use a mature library such as cantools for production workflows and verify against the authoritative protocol.

### 10. Public ECU connector pinout study
Browse the published 48-position external connector pin map from the separate [lflaherty/ev-ecu hardware project](https://github.com/lflaherty/ev-ecu/blob/master/hardware/Pinout.md). Filter connector banks A–D, search pin descriptions and inspect documented signal types and firmware usage. This is a real source-specific case study, not a universal connector standard or SJSU pinout. The original [schematic PDF](https://github.com/lflaherty/ev-ecu/blob/master/hardware/ECU_Schematic_Print.pdf) and [hardware notes](https://github.com/lflaherty/ev-ecu/blob/master/hardware/README.md) are linked alongside the pin detail. Never use a pin label alone as a wiring instruction.

### 11. Inverter and motor workbench
Explore a synthetic torque-speed envelope with DC-link voltage, torque request, motor speed, temperature, efficiency and torque-constant inputs. The workbench calculates a constant-torque / constant-power limit, simple thermal derating, shaft power, estimated phase current and DC-bus current. A chart shows the operating point against the illustrative torque-speed curve. It is a transparent first-order teaching model, not a validated motor/inverter plant model.

### 12. Engineering labs
Explore a first-order precharge RC response and the torque-speed mechanical power equation. Fault-diagnosis cases test reasoning about message freshness, CAN physical layers and precharge evidence. These are teaching aids, not component-selection or safety tools.

### 13. Live teaching simulator
Change accelerator and brake inputs and inject representative faults: APPS channel disagreement, cell overvoltage, BMS CAN heartbeat timeout, IMD insulation fault and BSPD trip.

Observe the model's validation, safety state, torque authorization, torque request and derived motor quantities. Values and thresholds are illustrative; the simulator is deterministic and is **not a validated plant model, ECU implementation or vehicle calibration**.

### 14. CAN network lab
Explore selected identifiers from a public USC Formula SAE VCU protocol header. The lab intentionally leaves payload bytes undecoded where the public source does not provide an authoritative signal definition. A CAN ID and DLC alone do not tell you start bit, length, signedness, endianness, scale, offset, units or timeout policy.

### 15. Public engineering reference library
The application links to real repositories, design reports and official resources. Read the original source before treating a detail as authoritative. The application distinguishes a source's documented facts from the synthetic vehicle's teaching abstractions.

## Reference implementations and source provenance

The following are **separate projects**. They are not one combined reference architecture and must not be presented as the design of another team.

| Public source | What it contributes to the learning material |
|---|---|
| [lflaherty/ev-ecu](https://github.com/lflaherty/ev-ecu) | FSAE-oriented ECU hardware, schematic, PCB, connector pinout, power distribution, shutdown circuit and layered STM32 firmware. |
| [SCFormulaElectric/vcu_stm32](https://github.com/SCFormulaElectric/vcu_stm32) | USC Formula SAE VCU firmware, task organization and public CAN protocol identifiers. Its README describes its own 500 kbit/s bus; that is not universal. |
| [Virginia Motorsports BMS project](https://chloegao.dev/projects/bms.html) | BMS example using ADBMS6830B cell monitors, an ADBMS6822 isoSPI bridge, transformer isolation, PEC checks and latched fault handling. Component choices and cell counts belong to that project. |
| [Columbia University Formula Racing EV21 design report](https://studentresearch.engineering.columbia.edu/sites/studentresearch.engineering.columbia.edu/files/content/FINAL%20v2.pdf) | System-level design study covering accumulator, modular BMS, HV/LV, cooling and motor/inverter sizing. |
| [Columbia FSAE software organization](https://github.com/columbia-fsae) | Public software and engineering resources, including ECU/VCU, DBC, SIL/HIL, controls and logging work. |
| [SAE Formula SAE official rules and resources](https://www.fsaeonline.com/cdsweb/gen/DocumentResources.aspx) | Normative event rules, electrical system form templates and inspection resources. Always select the exact event and year. |

### Source-use discipline
- Public implementations are **case studies**, not a standard to copy blindly.
- A repository's README, code, schematic, PCB and DBC may describe different levels of completeness. Check the actual artifact.
- Never infer an undocumented CAN payload from a message name or identifier.
- Never infer a vehicle's safety compliance from a block diagram or another team's design.
- Where a source-specific number appears (bitrate, cell count, IC, connector pin, current limit), it must remain explicitly attributed to that source.
- When evidence is missing, label it unknown rather than inventing a plausible value.

## Technical stack

- React 18 + Vite.
- Three.js through React Three Fiber and Drei for the interactive 3D scene.
- Lucide icons.
- Static, inspectable educational data in src/data.js.
- CSS responsive layout; no backend or environment variables required for the current learning prototype.

## Run locally

Requirements: a current Node.js LTS release and npm.

    git clone https://github.com/happyahluwalia/Electric-Race-Car-Systems.git
    cd Electric-Race-Car-Systems
    npm install
    npm run dev

Run the DBC parser unit tests and create a production build:

    npm test
    npm run build
    npm run preview

The Vercel project is configured for the repository's Vite application. A push to the connected Git branch triggers a deployment; check the deployment status before sharing a new release.

## Repository map

    .
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── main.jsx       # application, 3D scene, views and interactions
    │   ├── data.js        # component dossiers, public references and CAN examples
    │   └── style.css      # responsive visual system
    └── README.md

## Known limitations and next engineering steps

This project is an evolving educational explorer, not a finished digital twin. The vehicle and assembly 3D scenes are simplified teaching geometry; they are not detailed CAD, scale packaging models or harness-accurate netlists. The functional net explorer is not a connector/pin-level electrical schematic. The DBC editor parses a useful subset of standard BO_/SG_ declarations but is not a full DBC implementation. Its supported parsing and bit extraction are unit-tested; the production build runs these tests before bundling. The simulator and powertrain workbench are deterministic and use illustrative values rather than measured vehicle data.

Next development priorities:
1. Replace schematic blocks with detailed, clearly named 3D component assemblies and exploded subassemblies.
2. Add an interactive electrical schematic / net explorer with connectors, pin numbers, wire endpoints, power domains and traceable signal paths.
3. Build a deeper BMS walkthrough from cell tap through monitor IC, isolated link, master firmware, fault policy and vehicle interface.
4. Build a VCU software walkthrough from ADC and GPIO acquisition through plausibility checks, state machine, torque arbitration and CAN driver.
5. Add source-grounded DBC import / decode with explicit provenance and no guessed signal definitions.
6. Add more realistic precharge, contactor, DC-link and inverter/motor models, with assumptions and equations visible to learners.
7. Add guided labs, quizzes, testable learning objectives and fault-diagnosis exercises.
8. Add accessibility, keyboard navigation, reduced-motion support and automated tests for the teaching logic.

A feature should be considered complete only when its engineering assumptions, source provenance, interaction behaviour and limitations are visible and testable.

## Safety and responsible use

**This application is for education only. It is not a real-time controller, wiring instruction, high-voltage work procedure, engineering sign-off, rules-compliance assessment or safety-certified simulation.** Never connect it to a vehicle or use it to make vehicle control decisions.

High-voltage systems can cause fatal injury. Real vehicle design, construction, inspection and service require qualified supervision, approved procedures, appropriate test equipment, manufacturer documentation and the current competition rules. The shutdown circuit shown here is a functional teaching abstraction; the actual safety circuit must be designed, verified and reviewed against the applicable rules and the team's approved electrical-system documentation.

## Contributing and improving the learning material

Improvements are welcome when they make the engineering clearer and more verifiable:
- Cite the exact public source and relevant file / section for implementation-specific claims.
- Keep source-specific values attributed to the correct project.
- Mark synthetic values, assumptions and unknowns explicitly.
- Include a short learning objective and an acceptance test for new interactive labs.
- Avoid adding private team documents, credentials, vehicle telemetry or proprietary designs without permission.
