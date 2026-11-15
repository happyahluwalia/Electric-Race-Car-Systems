// Source registry. Every rule value, part number and datasheet figure in the
// learning content must point at one of these ids (enforced by test/content.test.js).
// `checked` is the date the claim text was last compared against the source.
export const sources = {
  fsae2024: {
    title: 'Formula SAE Rules 2024, Version 1.0',
    org: 'SAE International',
    kind: 'Competition rules',
    url: 'https://www.engr.colostate.edu/organizations/ram-racing-fsae/wp-content/uploads/sites/22/2023/09/FSAE_Rules_2024_V1-compressed.pdf',
    checked: '2026-11-14',
    note: 'Rule numbers and limits quoted in this app come from this edition. Rules change every season (the 2026 edition renames several terms), so always read the edition for your event.'
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
    checked: '2026-11-14'
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
  columbiaGh: {
    title: 'Columbia FSAE software repositories',
    org: 'columbia-fsae',
    kind: 'Team implementation',
    url: 'https://github.com/columbia-fsae',
    checked: '2026-11-14'
  }
};
