// Cases mirrored from opendbc/safety/tests/common.py (DriverTorqueSteeringSafetyTest)
// with the Hyundai limits, so the teaching model behaves like the real firmware.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HYUNDAI as L, initialGate, gateRx, gateTx, controllerLimit } from '../src/lib/safetygate.js';

const allowed = (prev = 0) => ({ ...initialGate(), controlsAllowed: true, desiredLast: prev, rtLast: prev });
const tx = (s, t, driver = 0) => gateTx(s, t, driver).sent;

test('test_non_realtime_limit_up: +/- rate_up passes, one more is blocked', () => {
  assert.equal(tx(allowed(0), L.rateUp), true);
  assert.equal(tx(allowed(0), -L.rateUp), true);
  assert.equal(tx(allowed(0), L.rateUp + 1), false);
  assert.equal(tx(allowed(0), -L.rateUp - 1), false);
});

test('torque without controls allowed is blocked; zero is fine', () => {
  assert.equal(tx(initialGate(), 1), false);
  assert.equal(tx(initialGate(), 0), true);
});

test('test_against_torque_driver: cannot stay at max once the driver pushes past the allowance', () => {
  for (const sign of [-1, 1]) {
    for (const d of [L.driverAllowance - 1, L.driverAllowance, L.driverAllowance + 1]) {
      assert.equal(tx(allowed(L.maxTorque * sign), L.maxTorque * sign, -d * sign), d <= L.driverAllowance, `d=${d} sign=${sign}`);
    }
    // wind down by factor units for every unit above the allowance
    const d = (L.driverAllowance + 10) * sign, want = (L.maxTorque - 10 * L.driverMultiplier) * sign;
    assert.equal(tx(allowed(want), want, -d), true);
    assert.equal(tx(allowed(want + sign), want + sign, -d), false);
    // well past the allowance the minimum wind-down is rate_down
    const big = Math.trunc(L.maxTorque / L.driverMultiplier + L.driverAllowance + 1) * sign;
    assert.equal(tx(allowed(L.maxTorque * sign), (L.maxTorque - L.rateDown) * sign, -big), true);
    assert.equal(tx(allowed(L.maxTorque * sign), 0, -big), true);
    assert.equal(tx(allowed(L.maxTorque * sign), (L.maxTorque - L.rateDown + 1) * sign, -big), false);
  }
});

test('test_realtime_limits: more than rt_delta within 250 ms is blocked until the window rolls', () => {
  for (const sign of [-1, 1]) {
    let s = allowed(0), ok = true;
    for (let t = 0; t < L.rtDelta; t += 1) { const r = gateTx(s, t * sign, 0, L, 0); ok &&= r.sent; s = r.state; }
    assert.equal(ok, true);
    // the next step is only +1 from the last command, so only the real-time window can block it
    assert.equal(gateTx(s, sign * (L.rtDelta + 1), 0, L, 0).sent, false);
  }
});

test('torque above the absolute limit is blocked even with a matching ramp', () => {
  assert.equal(tx(allowed(L.maxTorque), L.maxTorque + 1, 500), false);
});

test('controls enter on the rising edge of cruise and exit on the rising edge of the brake', () => {
  let s = gateRx(initialGate(), { cruise: true, brake: false, counter: 1 });
  assert.equal(s.controlsAllowed, true);
  s = gateRx(s, { cruise: true, brake: true, counter: 2 });
  assert.equal(s.controlsAllowed, false);
  s = gateRx(s, { cruise: true, brake: false, counter: 3 });
  assert.equal(s.controlsAllowed, false, 'holding cruise does not re-engage; it needs a new rising edge');
});

test('five wrong counters invalidate the message and drop controls', () => {
  let s = gateRx(initialGate(), { cruise: true, brake: false, counter: 1 });
  for (let i = 0; i < 4; i += 1) s = gateRx(s, { cruise: true, brake: false, counter: s.lastCounter });
  assert.equal(s.wrongCounters, 4); assert.equal(s.controlsAllowed, true);
  s = gateRx(s, { cruise: true, brake: false, counter: s.lastCounter });
  assert.equal(s.msgValid, false); assert.equal(s.controlsAllowed, false);
});

test('the controller-side clamp produces commands the gate accepts', () => {
  let s = allowed(0), last = 0;
  for (const [req, drv] of [[500, 0], [500, 0], [-500, 0], [200, -150], [384, 300], [0, 0]]) {
    for (let i = 0; i < 60; i += 1) {
      const cmd = controllerLimit(req, last, drv);
      const r = gateTx(s, cmd, drv);
      assert.equal(r.sent, true, `req=${req} drv=${drv} cmd=${cmd} last=${last}`);
      s = r.state; last = cmd;
    }
  }
});
