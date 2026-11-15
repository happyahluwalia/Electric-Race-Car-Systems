// A faithful, simplified port of the torque checks in comma.ai's opendbc safety
// firmware (opendbc/safety/lateral.h: steer_torque_cmd_checks with the
// TorqueDriverLimited branch, and safety.h: counter check and brake rising edge),
// using the Hyundai limits from opendbc/safety/modes/hyundai.h. The units are the
// raw integer torque units of that car's steering message, not newton-metres.
//
// Two layers are modelled, as in the real system:
//   controllerLimit()  — openpilot's own clamp, opendbc/car/lateral.py
//                        apply_driver_steer_torque_limits (runs on the main computer)
//   gateCheck()        — the firmware check on the small microcontroller between the
//                        computer and the car. It never edits a command: it blocks it.

export const HYUNDAI = {
  maxTorque: 384, rateUp: 3, rateDown: 7, rtDelta: 112,
  driverAllowance: 50, driverMultiplier: 2, hz: 100,
  rtIntervalUs: 250000, maxWrongCounters: 5
};

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

// opendbc/car/lateral.py apply_driver_steer_torque_limits (STEER_DRIVER_FACTOR = 1)
export function controllerLimit(request, last, driver, L = HYUNDAI) {
  const driverMax = L.maxTorque + (L.driverAllowance + driver) * L.driverMultiplier;
  const driverMin = -L.maxTorque + (-L.driverAllowance + driver) * L.driverMultiplier;
  const maxAllowed = Math.max(Math.min(L.maxTorque, driverMax), 0);
  const minAllowed = Math.min(Math.max(-L.maxTorque, driverMin), 0);
  let t = clamp(request, minAllowed, maxAllowed);
  if (last > 0) t = clamp(t, Math.max(last - L.rateDown, -L.rateUp), last + L.rateUp);
  else t = clamp(t, last - L.rateUp, Math.min(last + L.rateDown, L.rateUp));
  return Math.round(t);
}

export function initialGate() {
  return { controlsAllowed: false, cruisePrev: false, brakePrev: false, wrongCounters: 0, lastCounter: 0,
    desiredLast: 0, rtLast: 0, tsRtLast: 0, ts: 0 };
}

// Incoming-message side (safety.h). Returns the new state.
export function gateRx(s, { cruise, brake, counter }, L = HYUNDAI) {
  const n = { ...s };
  // update_counter: expected = (last + 1) % (max + 1); a match counts down, a miss counts up, clamped 0..5
  const expected = (s.lastCounter + 1) % 16;
  n.wrongCounters = clamp(s.wrongCounters + (counter === expected ? -1 : 1), 0, L.maxWrongCounters);
  n.lastCounter = counter;
  const msgValid = n.wrongCounters < L.maxWrongCounters;
  // pcm_cruise_check: enter on the rising edge of cruise, exit whenever cruise is off
  if (!cruise) n.controlsAllowed = false;
  if (cruise && !s.cruisePrev) n.controlsAllowed = true;
  n.cruisePrev = cruise;
  // generic_rx_checks: exit on the rising edge of the brake
  if (brake && !s.brakePrev) n.controlsAllowed = false;
  n.brakePrev = brake;
  if (!msgValid) n.controlsAllowed = false;
  n.msgValid = msgValid;
  return n;
}

// Outgoing-message side: steer_torque_cmd_checks, driver-limited branch.
// Returns { state, sent, checks } where checks lists each test and whether it passed.
export function gateTx(s, desired, driver, L = HYUNDAI, dtUs = 1e6 / L.hz) {
  const n = { ...s, ts: s.ts + dtUs };
  const checks = [];
  let violation = false;
  if (s.controlsAllowed) {
    const global = desired > L.maxTorque || desired < -L.maxTorque;
    checks.push({ id: 'global', label: `|torque| ≤ ${L.maxTorque}`, ok: !global });
    violation ||= global;

    const last = s.desiredLast;
    const hiRl = Math.max(last, 0) + L.rateUp, loRl = Math.min(last, 0) - L.rateUp;
    const drvMax = L.maxTorque + (L.driverAllowance + driver) * L.driverMultiplier;
    const drvMin = -L.maxTorque + (-L.driverAllowance + driver) * L.driverMultiplier;
    const hi = Math.min(hiRl, Math.max(last - L.rateDown, Math.max(drvMax, 0)));
    const lo = Math.max(loRl, Math.min(last + L.rateDown, Math.min(drvMin, 0)));
    const rateBad = desired > hiRl || desired < loRl;
    const driverBad = !rateBad && (desired > hi || desired < lo);
    checks.push({ id: 'rate', label: `Change ≤ ${L.rateUp} per frame upward`, ok: !rateBad, detail: `allowed ${loRl} to ${hiRl}` });
    checks.push({ id: 'driver', label: 'Not fighting the driver', ok: !driverBad, detail: `allowed ${lo} to ${hi}` });
    violation ||= rateBad || driverBad;
    n.desiredLast = desired;

    const rtHi = Math.max(s.rtLast, 0) + L.rtDelta, rtLo = Math.min(s.rtLast, 0) - L.rtDelta;
    const rtBad = desired > rtHi || desired < rtLo;
    checks.push({ id: 'rt', label: `Change ≤ ${L.rtDelta} per 250 ms`, ok: !rtBad });
    violation ||= rtBad;
    if (n.ts - s.tsRtLast > L.rtIntervalUs) { n.rtLast = desired; n.tsRtLast = n.ts; }
  }
  const torqueWithoutPermission = !s.controlsAllowed && desired !== 0;
  checks.unshift({ id: 'allowed', label: 'Controls allowed, or torque is zero', ok: !torqueWithoutPermission });
  violation ||= torqueWithoutPermission;
  if (violation || !s.controlsAllowed) { n.desiredLast = 0; n.rtLast = 0; n.tsRtLast = n.ts; }
  return { state: n, sent: !violation, checks };
}
