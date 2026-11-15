// Where things sit on the teaching car, in scene units (2 units is about 1 m).
// x runs nose (-) to tail (+), y is up, z is across the car. This is a plausible
// Formula-style layout for teaching, not a drawing of any real vehicle.
export const REAR_AXLE = 2.5;
export const FRONT_AXLE = -1.9;

export const positions = {
  apps: [-2.25, 0.62, 0.2],
  bspd: [-1.75, 0.34, -0.42],
  vcu: [-1.45, 0.42, 0.1],
  cancontroller: [-1.58, 0.56, 0.0],
  cantransceiver: [-1.32, 0.56, 0.24],
  dashboard: [-0.95, 1.12, 0],
  lv: [-0.2, 0.36, -0.98],
  dcdc: [0.35, 0.34, -0.98],
  can: [-0.1, 0.24, 0.66],
  shutdown: [0.45, 1.5, 0.82],
  tsal: [0.45, 2.22, 0],
  imd: [0.6, 1.18, -0.36],
  cooling: [0.1, 0.62, 1.02],
  sensors: [0.62, 0.9, 1.02],
  accumulator: [0.98, 0.56, 0],
  cell: [0.72, 0.95, 0.44],
  cellmonitor: [0.98, 0.93, -0.11],
  bms: [1.24, 0.97, 0.4],
  // high-voltage junction box behind the pack
  hvfuse: [1.56, 0.8, 0.3],
  air: [1.86, 0.8, 0.3],
  precharge: [1.71, 1.08, 0.3],
  packcurrent: [1.56, 0.32, -0.3],
  contactorCoil: [1.86, 0.32, -0.3],
  // rear: inverter above the motor
  dcLink: [2.12, 1.14, 0.0],
  inverter: [2.42, 1.14, 0],
  gateDriver: [2.42, 1.34, 0.0],
  motor: [2.35, 0.52, -0.1],
  resolver: [2.35, 0.52, -0.56]
};

// Cable routes drawn when a system is shown. Each is a list of waypoints.
const P = positions;
const up = ([x, y, z], dy) => [x, y + dy, z];
const phases = [
  [[2.42, 1.0, 0.14], [2.42, 0.74, 0.14], [2.35, 0.62, 0.02]],
  [[2.42, 1.0, 0.0], [2.35, 0.74, -0.1]],
  [[2.42, 1.0, -0.14], [2.42, 0.74, -0.24], [2.35, 0.62, -0.22]]
];
export const routes = {
  hv: [
    // positive side: pack + -> fuse -> relay -> inverter
    [[1.4, 0.8, 0.3], P.hvfuse, P.air, [2.02, 0.8, 0.3], [2.02, 1.06, 0.3], [2.42, 1.06, 0.3]],
    // negative side: pack - -> current sensor -> relay -> inverter
    [[1.4, 0.32, -0.3], P.packcurrent, P.contactorCoil, [2.02, 0.32, -0.3], [2.02, 1.06, -0.3], [2.42, 1.06, -0.3]],
    // precharge branch around the positive relay
    [[1.66, 0.8, 0.3], [1.66, 1.08, 0.3], P.precharge, [1.96, 1.08, 0.3], [1.96, 0.8, 0.3]],
    ...phases
  ],
  bms: [
    // isolated link from monitor board to monitor board, then to the master
    [[0.66, 0.95, -0.33], [0.82, 0.95, -0.33], [0.98, 0.95, -0.33], [1.14, 0.95, -0.33], [1.3, 0.95, -0.33], [1.3, 0.97, 0.1], P.bms],
    [P.cell, [0.72, 0.95, 0.1], [0.82, 0.95, -0.11]],
    [P.packcurrent, [1.44, 0.32, -0.3], [1.44, 0.97, 0.4], P.bms]
  ],
  powertrain: [
    [P.dcLink, P.inverter],
    ...phases,
    [P.resolver, [2.7, 0.52, -0.56], [2.7, 1.14, -0.3], [2.66, 1.14, -0.3]]
  ],
  control: [
    [P.apps, [-2.25, 0.3, 0.2], [-1.6, 0.3, 0.2], P.vcu],
    [P.vcu, [-1.45, 0.24, 0.66], [2.2, 0.24, 0.66], [2.2, 1.14, 0.4], [2.26, 1.14, 0.36]],
    [P.vcu, [-1.45, 0.9, 0.1], P.dashboard],
    [P.sensors, [0.62, 0.24, 1.02], [0.62, 0.24, 0.66]]
  ],
  comms: [
    // CAN trunk: dashboard at one end, inverter at the other, short stubs to each node
    [P.dashboard, [-0.95, 0.24, 0.66], [2.2, 0.24, 0.66], [2.2, 1.14, 0.4]],
    [P.vcu, [-1.45, 0.24, 0.66]],
    [P.bms, [1.24, 0.24, 0.66]],
    // isoSPI chain inside the pack
    [[0.66, 0.99, -0.33], [1.3, 0.99, -0.33], [1.3, 1.0, 0.1], up(P.bms, 0.03)]
  ],
  safety: [
    // the series loop: LV supply -> buttons -> pedal box devices -> IMD -> BMS -> relay coils
    [[-0.2, 0.3, -0.7], [0.45, 0.3, -0.82], [0.45, 1.5, -0.82], [0.45, 2.05, -0.45], [0.45, 2.05, 0.45], P.shutdown, [0.45, 1.05, 0.82],
      [-0.95, 1.05, 0.5], [-0.95, 1.05, -0.3], [-1.75, 0.34, -0.42], [-1.75, 0.2, -0.42], [0.6, 0.2, -0.36], P.imd,
      [1.24, 1.18, -0.36], [1.24, 1.02, 0.4], [1.44, 1.02, 0.5], [1.86, 1.02, 0.5], P.air],
    [[1.86, 1.02, 0.5], [1.86, 0.6, 0.5], [1.86, 0.6, -0.3], P.contactorCoil],
    [P.tsal, [0.45, 1.6, 0.0], [2.02, 1.3, 0.0], [2.02, 1.06, 0.1]]
  ],
  lv: [
    [P.lv, [-0.2, 0.2, -0.7], [-1.45, 0.2, -0.3], P.vcu],
    [P.lv, [-0.2, 0.2, -0.7], [1.24, 0.2, -0.7], [1.24, 0.9, -0.5]],
    [P.dcdc, [0.35, 0.2, -0.7]],
    [[1.4, 0.5, -0.45], [1.0, 0.2, -0.7], [0.35, 0.2, -0.7]],
    [P.lv, [-0.2, 0.2, -0.7], [-0.95, 0.2, -0.3], [-0.95, 1.0, -0.2]]
  ],
  thermal: [
    [P.cooling, [0.9, 0.3, 1.02], [2.35, 0.3, 0.6], [2.35, 0.52, 0.3]],
    [[2.35, 0.74, 0.2], [2.42, 1.0, 0.34], [2.7, 1.14, 0.34], [2.7, 0.9, 0.9], [0.5, 0.9, 1.02], P.cooling]
  ]
};
