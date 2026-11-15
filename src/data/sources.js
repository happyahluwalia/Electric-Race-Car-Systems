// Source registry. Every rule value, part number and datasheet figure in the
// learning content must point at one of these ids (enforced by test/content.test.js).
// `checked` is the date the claim text was last compared against the source.
export const sources = {
  fsae2027: {
    title: 'Formula SAE Rules 2027, Version 1.0 (1 September 2026)',
    org: 'SAE International',
    kind: 'Competition rules',
    url: 'https://fsaeonline.com/cdsweb/gen/DownloadDocument.aspx?DocumentID=da79bcb4-0935-4f7b-83d7-0dbb8ce68d38',
    checked: '2026-11-15',
    note: 'Every rule number and limit in this app was read from the text of this edition. It renames older terms: accumulator is now tractive battery, segment is module, AMS is BMS, AIR is isolation relay, and the single TSAL became a Ready to Move Light plus a Tractive System Status Indicator. Always read the edition for your event.'
  },
  fsaeDocs: {
    title: 'Formula SAE official rules and document resources',
    org: 'SAE International',
    kind: 'Competition rules',
    url: 'https://www.fsaeonline.com/cdsweb/gen/DocumentResources.aspx',
    checked: '2026-11-14',
    note: 'Where to download the current season rules, the Electrical System Form and inspection sheets.'
  },
  adbms6830b: {
    title: 'ADBMS6830B 16-channel multicell battery monitor: product page and data sheet',
    org: 'Analog Devices',
    kind: 'Datasheet',
    url: 'https://www.analog.com/en/products/adbms6830b.html',
    checked: '2026-11-14'
  },
  ltc6811: {
    title: 'LTC6811-1 / LTC6811-2 12-cell battery stack monitors: data sheet',
    org: 'Analog Devices (Linear Technology)',
    kind: 'Datasheet',
    url: 'https://www.analog.com/media/en/technical-documentation/data-sheets/LTC6811-1-6811-2.pdf',
    checked: '2026-11-14'
  },
  bq79616: {
    title: 'BQ79616-Q1 16S battery monitor, balancer and protector: product page',
    org: 'Texas Instruments',
    kind: 'Datasheet',
    url: 'https://www.ti.com/product/BQ79616-Q1',
    checked: '2026-11-14'
  },
  ir155: {
    title: 'ISOMETER IR155-3203 / IR155-3204 insulation monitoring device',
    org: 'Bender',
    kind: 'Datasheet',
    url: 'https://www.bender.de/en/products/insulation-monitoring/isometer-ir155-3203-ir155-3204/',
    checked: '2026-11-14'
  },
  p45b: {
    title: 'INR-21700-P45B lithium-ion cell: product data sheet',
    org: 'Molicel (E-One Moli Energy)',
    kind: 'Datasheet',
    url: 'https://www.imrbatteries.com/content/molicel_p45b.pdf',
    checked: '2026-11-15',
    note: 'Figures used: 4500 mAh typical, 3.6 V nominal, 4.2 V charge, 2.5 V discharge cut-off, 45 A continuous (80 °C cut-off), 70 g max, 15 mΩ DC at 50% SOC.'
  },
  sloa101: {
    title: 'Introduction to the Controller Area Network (CAN), application report SLOA101',
    org: 'Texas Instruments',
    kind: 'Application note',
    url: 'https://www.ti.com/lit/SLOA101',
    checked: '2026-11-14'
  },
  vmsBms: {
    title: 'Virginia Motorsports BMS project write-up',
    org: 'Chloe Gao / Virginia Motorsports',
    kind: 'Team implementation',
    url: 'https://chloegao.dev/projects/bms.html',
    checked: '2026-11-14',
    note: 'One team\'s design. Cell counts, thresholds and task timings belong to that car only.'
  },
  columbiaEv21: {
    title: 'Columbia University Formula Racing EV21 design summary',
    org: 'Columbia University',
    kind: 'Team implementation',
    url: 'https://studentresearch.engineering.columbia.edu/sites/studentresearch.engineering.columbia.edu/files/content/FINAL%20v2.pdf',
    checked: '2026-11-14',
    note: 'A short design summary (booklet pages 16 to 18). It names parts but gives few numbers.'
  },
  evEcu: {
    title: 'lflaherty/ev-ecu: open-source Formula SAE ECU hardware and firmware',
    org: 'lflaherty',
    kind: 'Team implementation',
    url: 'https://github.com/lflaherty/ev-ecu',
    checked: '2026-11-14',
    note: 'The connector pinout in the ECU pinout lab is copied from this project\'s Pinout.md.'
  },
  uscVcu: {
    title: 'USC Formula Electric VCU firmware (vcu_stm32)',
    org: 'SCFormulaElectric',
    kind: 'Team implementation',
    url: 'https://github.com/SCFormulaElectric/vcu_stm32',
    checked: '2026-11-14'
  },
  lobberding2020: {
    title: 'From Cell to Battery System in BEVs: Analysis of System Packing Efficiency and Cell Types (World Electric Vehicle Journal 11(4):77)',
    org: 'Löbberding et al., RWTH Aachen / Fraunhofer IPT',
    kind: 'Peer-reviewed paper (open access)',
    url: 'https://www.mdpi.com/2032-6653/11/4/77',
    checked: '2026-11-15',
    note: 'Survey of 25 production BEVs, 2010 to 2019: cell, module and system energy density, and a trend to larger and prismatic cells.'
  },
  ev200: {
    title: 'KILOVAC EV200 series contactor data sheet',
    org: 'TE Connectivity',
    kind: 'Datasheet',
    url: 'https://www.mouser.com/datasheet/2/418/6/ENG_CS_5_1773450_5_sec7_EV200A_1120-1091743.pdf',
    checked: '2026-11-15',
    note: 'Figures used: 12 to 900 V DC, 500+ A carry, 2000 A interrupt at 320 V DC, hermetically sealed, coil economiser (1.7 W hold at 12 V), optional auxiliary contact, 1 million cycle mechanical life.'
  },
  ucc21750: {
    title: 'UCC21750 10-A source/sink reinforced isolated single-channel gate driver for SiC/IGBT with active protection: data sheet (SLUSD78)',
    org: 'Texas Instruments',
    kind: 'Datasheet',
    url: 'https://www.ti.com/lit/pdf/SLUSD78',
    checked: '2026-11-15',
    note: 'Figures used: 5.7 kVrms isolation, DESAT protection with 200 ns response, soft turn-off, active Miller clamp, undervoltage lockout.'
  },
  ad2s1210: {
    title: 'AD2S1210 variable resolution 10-bit to 16-bit resolver-to-digital converter with reference oscillator',
    org: 'Analog Devices',
    kind: 'Datasheet',
    url: 'https://www.analog.com/en/products/ad2s1210.html',
    checked: '2026-11-15',
    note: 'Used for: on-chip excitation oscillator, tracking loop, and loss-of-signal / degradation / clipping fault detection.'
  },
  wolfspeedSic: {
    title: 'How Wolfspeed power modules are revolutionizing 3-phase industrial low voltage motor drives',
    org: 'Wolfspeed',
    kind: 'Manufacturer application article',
    url: 'https://www.wolfspeed.com/knowledge-center/article/how-wolfspeed-power-modules-are-revolutionizing-3-phase-industrial-low-voltage-motor-drives/',
    checked: '2026-11-15',
    note: 'A vendor comparison: a 30 A SiC module against a 100 A silicon IGBT module in a 25 kW inverter at 8 kHz. Treat the percentages as one manufacturer\'s benchmark.'
  },
  emrax208: {
    title: 'EMRAX 208 technical data sheet, version 1.7',
    org: 'EMRAX d.o.o.',
    kind: 'Datasheet',
    url: 'https://emrax.com/wp-content/uploads/2025/03/EMRAX-208_datasheet_v1.7.pdf',
    checked: '2026-11-15',
    note: 'Figures used: axial-flux permanent-magnet synchronous motor, 9.4 to 10.3 kg, 86 kW peak, continuous 33 kW air-cooled, 47 kW liquid-cooled, 52 kW combined, resolver or encoder, 50 to 830 V.'
  },
  lemClosedLoop: {
    title: 'Closed loop current transducers with excellent performance are also cost-effective',
    org: 'LEM',
    kind: 'Manufacturer technical article',
    url: 'https://www.lem.com/en/file/7092/download',
    checked: '2026-11-15',
    note: 'Compares open-loop Hall, closed-loop Hall and fluxgate transducers on offset and offset drift.'
  },
  lemSensors: {
    title: 'Current sensors: technologies and featured families',
    org: 'LEM',
    kind: 'Manufacturer product page',
    url: 'https://www.lem.com/en/node/9748',
    checked: '2026-11-15',
    note: 'Describes the CAB family as aimed at state-of-charge estimation in EV battery management, with under 0.5% accuracy and under 50 mA offset.'
  },
  cdeFilm: {
    title: 'Power film capacitor application guide',
    org: 'Cornell Dubilier',
    kind: 'Manufacturer application guide',
    url: 'https://www.mouser.lt/pdfDocs/filmAPPguide.pdf',
    checked: '2026-11-15',
    note: 'Section "Advantages of film capacitors versus aluminum electrolytics for DC link applications".'
  },
  plettSoc: {
    title: 'ECEA 5732 Battery State-of-Charge (SOC) Estimation (Algorithms for Battery Management Systems), Gregory Plett',
    org: 'University of Colorado Boulder',
    kind: 'University course',
    url: 'https://www.colorado.edu/ecee/online-masters/curriculum/power-electronics/ecea-5732-battery-state-charge-soc-estimation',
    checked: '2026-11-15',
    note: 'Covers voltage-based and current-based estimators and their limitations, then extended and sigma-point Kalman filters, including current-sensor bias.'
  },
  cssDbc: {
    title: 'CAN DBC file explained: a simple intro',
    org: 'CSS Electronics',
    kind: 'Tutorial',
    url: 'https://www.csselectronics.com/pages/can-dbc-file-database-intro',
    checked: '2026-11-15'
  },
  can20: {
    title: 'CAN Specification, Version 2.0 (1991), Parts A and B',
    org: 'Robert Bosch GmbH',
    kind: 'Protocol specification',
    url: 'https://weble.upc.edu/asig/ea/practica4/CAN20B.pdf',
    checked: '2026-11-15',
    note: 'University-hosted copy of the Bosch document. Fault confinement: error passive above 127, bus off when the transmit error counter exceeds 255, recovery after 128 sequences of 11 recessive bits.'
  },
  tiSnoaa12: {
    title: 'Methods to reduce thermistor linearization error, memory, and power requirements over wide operating temperature ranges (SNOAA12)',
    org: 'Texas Instruments',
    kind: 'Application note',
    url: 'https://www.ti.com/lit/pdf/SNOAA12',
    checked: '2026-11-15',
    note: 'Compares lookup tables, polynomial fits and the Steinhart-Hart equation for NTC thermistors in a voltage divider.'
  },
  gundogdu2022: {
    title: 'Comparative study of permanent magnet, conventional, and advanced induction machines for traction applications (World Electric Vehicle Journal 13(8):137)',
    org: 'Gundogdu, Zhu and Chan, University of Sheffield',
    kind: 'Peer-reviewed paper (open access)',
    url: 'https://www.mdpi.com/2032-6653/13/8/137',
    checked: '2026-11-15',
    note: 'Interior-PM machines: higher power factor and efficiency than induction machines; magnet demagnetisation limits their overload torque.'
  },
  as5262: {
    title: 'AS5262 contactless pedal position sensor example',
    org: 'ams OSRAM',
    kind: 'Manufacturer application sheet',
    url: 'https://look.ams-osram.com/m/03b8a487a09c7eb9/original/AS5262_FS000180_1-00.pdf',
    checked: '2026-11-15',
    note: 'A fully redundant dual-output Hall-effect pedal sensor with failure diagnostics, aimed at ISO 26262 systems.'
  },
  freertosFaq: {
    title: 'FreeRTOS FAQ: why use an RTOS?',
    org: 'FreeRTOS (Amazon Web Services)',
    kind: 'Vendor documentation',
    url: 'https://www.freertos.org/FAQWhat.html',
    checked: '2026-11-15'
  },
  opendbc: {
    title: 'commaai/opendbc: DBC files, CAN library and safety firmware (README, opendbc/dbc/)',
    org: 'comma.ai',
    kind: 'Open-source production code',
    url: 'https://github.com/commaai/opendbc',
    checked: '2026-11-15',
    note: 'MIT licence. Read at commit 27fa1c5 (7 Nov 2026). The GM high-voltage DBC used in the decoder lab is copied unchanged from opendbc/dbc/. It is community reverse-engineered, not a manufacturer document.'
  },
  opendbcSafety: {
    title: 'opendbc safety firmware: safety.h, lateral.h, modes/hyundai.h and tests/common.py',
    org: 'comma.ai',
    kind: 'Open-source production code',
    url: 'https://github.com/commaai/opendbc/tree/master/opendbc/safety',
    checked: '2026-11-15',
    note: 'Figures used (Hyundai mode): max torque 384, rate up 3 and down 7 per frame, 112 per 250 ms window, driver allowance 50 with multiplier 2, controls dropped after 5 wrong counters, on a brake rising edge, or when cruise disengages.'
  },
  openpilotSafety: {
    title: 'openpilot safety (docs/SAFETY.md)',
    org: 'comma.ai',
    kind: 'Vendor documentation',
    url: 'https://github.com/commaai/openpilot/blob/master/docs/SAFETY.md',
    checked: '2026-11-15',
    note: 'States that the driver must always be able to retake control immediately, and that the vehicle must not change trajectory too quickly for the driver to react.'
  },
  cabana: {
    title: 'Cabana: CAN analysis tool (openpilot wiki)',
    org: 'comma.ai',
    kind: 'Tool documentation',
    url: 'https://github.com/commaai/openpilot/wiki/Cabana',
    checked: '2026-11-15'
  },
  columbiaGh: {
    title: 'Columbia FSAE software repositories',
    org: 'columbia-fsae',
    kind: 'Team implementation',
    url: 'https://github.com/columbia-fsae',
    checked: '2026-11-14'
  }
};
