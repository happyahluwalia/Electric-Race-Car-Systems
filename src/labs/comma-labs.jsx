// Labs built from comma.ai's open-source opendbc project (MIT licence).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import { HYUNDAI as L, initialGate, gateRx, gateTx, controllerLimit } from '../lib/safetygate.js';
import { parseDbc, parseHexBytes, decodeSignal, presentSignals, encodeSignal, parseValueTables } from '../lib/dbc.js';
import gmDbc from '../data/dbc/gm_global_a_high_voltage_management.dbc?raw';
import { SourceLinks } from '../ui.jsx';
import './labs.css';

const Card = ({ children, wide }) => <section className={wide ? 'learn-card wide' : 'learn-card'}>{children}</section>;
const hex = b => b.map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ');

/* ================================================================== */
/* 1. The safety gate                                                  */
/* ================================================================== */

const HISTORY = 300; // frames = 3 s at 100 Hz

function Chart({ frames }) {
  const W = 640, H = 200, y = v => H / 2 - (v / 500) * (H / 2 - 8), x = i => (i / (HISTORY - 1)) * W;
  const line = key => frames.map((f, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(f[key]).toFixed(1)}`).join('');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="gatechart" role="img" aria-label="Requested torque and torque sent over the last three seconds">
      {[384, -384].map(v => <g key={v}><line x1="0" x2={W} y1={y(v)} y2={y(v)} className="lim" /><text x="4" y={y(v) + (v > 0 ? -4 : 12)}>{v > 0 ? '+' : '−'}384 limit</text></g>)}
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="zero" />
      {frames.map((f, i) => !f.sent && <rect key={i} x={x(i) - 1} y="0" width="2.2" height={H} className="blocked" />)}
      {frames.length > 1 && <path d={line('request')} className="req" />}
      {frames.length > 1 && <path d={line('cmd')} className="cmd" />}
    </svg>
  );
}

export function SafetyGateLab() {
  const [request, setRequest] = useState(300);
  const [driver, setDriver] = useState(0);
  const [limiter, setLimiter] = useState(true);
  const [cruise, setCruise] = useState(false);
  const [playing, setPlaying] = useState(true);
  const sim = useRef({ gate: initialGate(), last: 0, counter: 0, brake: 0, corrupt: 0 });
  const [frames, setFrames] = useState(() => Array.from({ length: HISTORY }, () => ({ request: 0, cmd: 0, sent: true })));
  const [latest, setLatest] = useState({ checks: [], sent: true, gate: initialGate(), cmd: 0 });
  const inputs = useRef({}); inputs.current = { request, driver, limiter, cruise };

  const step = n => {
    const s = sim.current; const add = [];
    let r;
    for (let k = 0; k < n; k += 1) {
      const { request: req, driver: drv, limiter: lim, cruise: cr } = inputs.current;
      s.counter = (s.counter + 1) % 16;
      const counter = s.corrupt > 0 ? (s.corrupt -= 1, s.gate.lastCounter) : s.counter;
      s.gate = gateRx(s.gate, { cruise: cr, brake: s.brake > 0, counter });
      if (s.brake > 0) s.brake -= 1;
      // the main computer: clamps itself if the limiter is on, and sends 0 when it knows it is not allowed
      const cmd = !s.gate.controlsAllowed ? 0 : lim ? controllerLimit(req, s.last, drv) : req;
      r = gateTx(s.gate, cmd, drv);
      s.gate = r.state;
      s.last = r.sent ? cmd : 0;
      add.push({ request: s.gate.controlsAllowed || cmd ? req : 0, cmd: r.sent ? cmd : 0, sent: r.sent });
    }
    setFrames(f => [...f, ...add].slice(-HISTORY));
    setLatest({ checks: r.checks, sent: r.sent, gate: s.gate, cmd: add[add.length - 1].cmd });
  };
  useEffect(() => {
    if (!playing) return undefined;
    const t = setInterval(() => step(2), 20);
    return () => clearInterval(t);
  }, [playing]);

  const reset = () => {
    sim.current = { gate: initialGate(), last: 0, counter: 0, brake: 0, corrupt: 0 };
    setCruise(false); setRequest(300); setDriver(0); setLimiter(true);
    setFrames(Array.from({ length: HISTORY }, () => ({ request: 0, cmd: 0, sent: true })));
  };
  const blocked = frames.filter(f => !f.sent).length;
  const g = latest.gate;

  return (
    <div className="learn-page">
      <header className="learn-heading"><div>
        <div className="learn-eyebrow">SAFETY FIRMWARE · FROM A REAL PRODUCT</div>
        <h1>The safety gate: a small program that can only say no</h1>
        <p>comma.ai's openpilot steers, and on many cars accelerates and brakes, ordinary road cars. The decisions come from a large computer running neural networks and planners, which can be wrong. So every command it sends passes through a small microcontroller running carefully tested C: about 1,600 lines of shared safety logic plus a short module per car brand. That firmware does not decide anything. It checks each message against fixed limits and <b>blocks</b> the ones that break them. It never edits a command into a safe one.</p>
      </div></header>

      <div className="why">
        <h2>Why this matters for your car</h2>
        <ul>
          <li><b>Complex code will eventually be wrong.</b> The question is not whether, but what stops the damage when it is. Here the answer is a separate, simple layer that is small enough to test exhaustively.</li>
          <li><b>Your car already uses this idea in hardware.</b> The BSPD, the shutdown circuit and the rule that algorithms may only <em>reduce</em> requested torque (EV.3.1.3) all exist because the VCU might be the thing that failed.</li>
          <li><b>It is defence in depth.</b> openpilot clamps its own commands first (in Python). The firmware then re-checks them independently (in C). Two implementations of the same limit, written separately, rarely fail the same way.</li>
        </ul>
      </div>

      <div className="lab-grid">
        <Card>
          <div className="learn-card-head"><h2>Controls</h2>
            <div className="btnrow">
              <button onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause /> : <Play />}{playing ? 'Pause' : 'Play'}</button>
              <button onClick={() => step(1)} disabled={playing}><StepForward /> 1 frame</button>
              <button onClick={reset}><RotateCcw /> Reset</button>
            </div>
          </div>
          <div className="toggle-grid">
            <label><input type="checkbox" checked={cruise} onChange={e => setCruise(e.target.checked)} /> Cruise control engaged (the driver's permission)</label>
            <label><input type="checkbox" checked={limiter} onChange={e => setLimiter(e.target.checked)} /> openpilot's own limiter on (layer 1)</label>
          </div>
          <label className="lab-range">What the planner wants<b>{request}</b>
            <input type="range" min={-500} max={500} step={5} value={request} onChange={e => setRequest(+e.target.value)} /></label>
          <label className="lab-range">Driver's hands on the wheel<b>{driver}</b>
            <input type="range" min={-300} max={300} step={5} value={driver} onChange={e => setDriver(+e.target.value)} /></label>
          <div className="btnrow">
            <button onClick={() => { sim.current.brake = 3; }}>Tap the brake</button>
            <button onClick={() => { sim.current.corrupt = 6; }}>Repeat the message counter 6 times</button>
          </div>
          <p className="small">Units are the raw torque units of the Hyundai steering message, as in the firmware. One frame is 10 ms.</p>
        </Card>

        <Card>
          <div className="learn-card-head"><h2>Last 3 seconds</h2><span className="legend2"><i className="req" />wanted <i className="cmd" />sent <i className="blk" />blocked</span></div>
          <Chart frames={frames} />
          <div className="lab-result">
            <span>Controls allowed <b className={g.controlsAllowed ? 'good' : 'bad'}>{g.controlsAllowed ? 'YES' : 'NO'}</b></span>
            <span>Bad counters <b>{g.wrongCounters ?? 0} / {L.maxWrongCounters}</b></span>
            <span>Sent now <b>{latest.cmd}</b></span>
            <span>Blocked in window <b className={blocked ? 'bad' : 'good'}>{blocked}</b></span>
          </div>
          <div className="validity-list">
            {latest.checks.map(c => <p key={c.id}>{c.label}<b className={c.ok ? 'good' : 'bad'}>{c.ok ? 'PASS' : 'BLOCK'}{c.detail ? ` · ${c.detail}` : ''}</b></p>)}
          </div>
        </Card>
      </div>

      <Card wide>
        <h2>Try these, in order</h2>
        <ol className="tries">
          <li><b>Nothing happens until you give permission.</b> With cruise off, move the planner slider. Nothing is sent: torque without permission is a violation, so the computer sends zero. <em>Rule in the code: "controls allowed, or torque is zero".</em></li>
          <li><b>Engage cruise.</b> The sent torque climbs 3 units per frame toward the request and stops at 384, even if you ask for 500. It takes about 1.3 s to reach full torque. That slowness is deliberate: a driver must have time to react.</li>
          <li><b>Switch off openpilot's own limiter</b> (with the planner far from the current torque). Now the big computer sends whatever the planner wants. The first jump breaks the rate limit and is <b>blocked</b>. Because a blocked frame resets the firmware's memory to zero, every following large jump is blocked too. The red band is the gate doing its only job.</li>
          <li><b>Turn the limiter back on and push the wheel against it</b> (driver slider opposite in sign, beyond 50). The allowed torque winds down 2 units for every unit the driver pushes past 50. The driver always wins.</li>
          <li><b>Tap the brake.</b> Controls drop instantly and stay dropped. Untick and re-tick cruise to re-engage: permission needs a new rising edge, not a held switch.</li>
          <li><b>Repeat the counter.</b> Each message carries a counter that must step by one. After five bad ones the firmware treats that input as untrustworthy and drops controls. Stale or frozen data is a fault, not a value.</li>
        </ol>
      </Card>

      <Card wide>
        <h2>The same ideas on a Formula SAE car</h2>
        <div className="maptable" role="table">
          <div role="row" className="head"><b role="columnheader">In opendbc safety</b><b role="columnheader">On your car</b><b role="columnheader">Where in this explorer</b></div>
          <div role="row"><span role="cell">A separate layer blocks bad commands and never edits them</span><span role="cell">BSPD and the shutdown circuit act independently of the VCU</span><span role="cell">BSPD, Shutdown circuit (EV.8.7.1, EV.8.1.5)</span></div>
          <div role="row"><span role="cell">Torque only with permission (controls allowed)</span><span role="cell">Ready to Drive needs brake held plus a deliberate action</span><span role="cell">VCU (EV.10.6.2)</span></div>
          <div role="row"><span role="cell">Brake press drops control at once</span><span role="cell">APPS/brake plausibility cuts motor power</span><span role="cell">VCU (EV.4.7.1, EV.4.7.2)</span></div>
          <div role="row"><span role="cell">Torque rises slowly and the driver can always overpower it</span><span role="cell">Algorithms may only reduce the driver's requested torque</span><span role="cell">Inverter (EV.3.1.3)</span></div>
          <div role="row"><span role="cell">Bad counter or stale message means "not trusted"</span><span role="cell">BMS must fault on a missing measurement; USC treats inverter status older than 250 ms as unsafe</span><span role="cell">BMS (EV.8.3.4), Inverter firmware</span></div>
          <div role="row"><span role="cell">Same limit coded twice, in Python and in C</span><span role="cell">VCU pedal check plus the hardware BSPD</span><span role="cell">BSPD</span></div>
        </div>
      </Card>

      <Card wide>
        <h2>How they make sure the gate itself is right</h2>
        <p>A safety layer is only worth having if it is more trustworthy than the thing it guards. opendbc's published practice, all of which applies to BMS fault code:</p>
        <ul className="rigor">
          <li><b>Strict compiler flags.</b> <code>-Wall -Wextra -Wstrict-prototypes -Werror</code>: every warning stops the build.</li>
          <li><b>MISRA C:2012 checking</b> with cppcheck: a coding standard that bans the C constructs most likely to hide bugs.</li>
          <li><b>Unit tests for every supported car</b>, with <b>100% line coverage enforced</b>: every line of safety code runs in a test.</li>
          <li><b>Mutation testing</b>: a tool deliberately breaks the code, one change at a time (turns <code>&gt;=</code> into <code>&lt;</code>, <code>+</code> into <code>-</code>, <code>&amp;</code> into <code>|</code>, or drops a <code>!</code>), and checks that some test fails. Coverage proves a line ran; mutation testing proves a test would notice if it were wrong.</li>
          <li><b>Two copies of the safety state.</b> Every check runs twice on separate copies and the results are compared, a guard against memory corruption. In the current code a mismatch is recorded but not yet acted on.</li>
        </ul>
        <p className="basis"><span>Honest limits</span>This lab is a simplified port of the steering checks in <code>lateral.h</code> and the input checks in <code>safety.h</code>, using one car's limits. Its tests reproduce cases from opendbc's own test suite. It leaves out checksums, the 1 Hz timeout check and the harness relay check. A road-car steering aid and a 600 V race car have different hazards; the lesson is the discipline, not the numbers.</p>
      </Card>
      <SourceLinks ids={['opendbc', 'opendbcSafety', 'openpilotSafety']} />
    </div>
  );
}

/* ================================================================== */
/* 2. A real battery DBC, with multiplexing                            */
/* ================================================================== */

const synthetic = ['VERSION "EV Systems Explorer synthetic example"', 'BU_: VCU Inverter BMS', '',
  'BO_ 256 TeachingStatus: 8 VCU', ' SG_ TorqueRequest : 0|16@1+ (0.1,0) [0|6553.5] "Nm" Inverter',
  ' SG_ Enable : 16|1@1+ (1,0) [0|1] "bool" Inverter', ' SG_ Temperature : 24|8@1- (1,-40) [-40|215] "degC" Inverter', '',
  'BO_ 512 TeachingBattery: 8 BMS', ' SG_ PackVoltage : 0|16@1+ (0.1,0) [0|6553.5] "V" VCU',
  ' SG_ PackCurrent : 16|16@1- (0.1,0) [-3276.8|3276.7] "A" VCU'].join('\n');

// Example payloads are built from the DBC with encodeSignal, so bytes and decoder always agree.
function gmExamples(messages) {
  const by = id => messages.find(m => m.id === id);
  const put = (id, values) => values.reduce((b, [n, v]) => encodeSignal(by(id).signals.find(s => s.name === n), v, b), Array(by(id).dlc).fill(0));
  const bank = k => put(512, [['Cell_Bank_Number_1', k], [`Voltage_1_${k}_A`, 3.9 + 0.01 * k], [`Voltage_1_${k}_B`, 3.905 + 0.01 * k], [`Voltage_1_${k}_C`, 3.8975 + 0.01 * k]]);
  return {
    512: Array.from({ length: 8 }, (_, k) => bank(k)),
    528: [put(528, [['Pack_Voltage', 372.5], ['Pack_Current', -8.5]])],
    770: [put(770, [['Switch', 0], ['Temp_A', 24.5], ['Temp_B', 25], ['Temp_C', 26.5], ['Temp_D', 25.5], ['Temp_E', 24], ['Temp_F', 27]]),
      put(770, [['Switch', 1], ['Temp_G', 26], ['Temp_H', 25.5], ['Temp_I', 24.5]])],
    782: [put(782, [['Command', 3]])],
    1120: [put(1120, [['Inlet_Coolant_Temp', 22.5], ['Outlet_Coolant_Temp', 28]])]
  };
}

export function DbcLab() {
  const [preset, setPreset] = useState('gm');
  const [src, setSrc] = useState(gmDbc);
  const messages = useMemo(() => parseDbc(src), [src]);
  const values = useMemo(() => parseValueTables(src), [src]);
  const examples = useMemo(() => (preset === 'gm' ? gmExamples(parseDbc(gmDbc)) : { 256: [[0xD2, 0x04, 0x01, 0x5A, 0, 0, 0, 0]], 512: [[0x8D, 0x0E, 0xAB, 0xFF, 0, 0, 0, 0]] }), [preset]);
  const [id, setId] = useState(512);
  const [ex, setEx] = useState(0);
  const msg = messages.find(m => m.id === id) || messages[0];
  const [payload, setPayload] = useState(() => hex(gmExamples(parseDbc(gmDbc))[512][0]));
  const bytes = parseHexBytes(payload);
  const ok = msg && bytes && bytes.length === msg.dlc;
  const sigs = ok ? presentSignals(msg, bytes) : [];

  const load = (p) => {
    setPreset(p); const s = p === 'gm' ? gmDbc : synthetic; setSrc(s);
    const first = p === 'gm' ? 512 : 256; setId(first); setEx(0);
    setPayload(hex((p === 'gm' ? gmExamples(parseDbc(gmDbc)) : { 256: [[0xD2, 0x04, 0x01, 0x5A, 0, 0, 0, 0]] })[first][0]));
  };
  const pick = (newId) => { setId(newId); setEx(0); const e = examples[newId]; setPayload(e ? hex(e[0]) : ''); };
  const nextEx = () => { const e = examples[msg.id]; if (!e) return; const k = (ex + 1) % e.length; setEx(k); setPayload(hex(e[k])); };

  return (
    <div className="learn-page">
      <header className="learn-heading"><div>
        <div className="learn-eyebrow">COMMUNICATION · DBC DECODER</div>
        <h1>Decode a real battery's CAN messages</h1>
        <p>The default file is a real DBC from comma.ai's open-source opendbc collection: the messages a GM <b>Battery Energy Control Module</b> puts on the bus. It was reverse-engineered by the community, so some signals are still called <code>Unknown</code>. Pick a message, read the bytes, and see each signal decoded with its bit position, byte order and scaling.</p>
      </div></header>

      <div className="why">
        <h2>The idea to take away: multiplexing</h2>
        <ul>
          <li>An 8-byte CAN frame cannot carry a whole pack. <code>Battery_Module_1</code> carries <b>three</b> cell voltages at a time, plus a 3-bit <b>bank number</b> that says which three.</li>
          <li>The sender cycles the bank 0 to 7, so one message identifier covers 8 × 3 = 24 cells. Four module messages cover 96. In the DBC, <code>M</code> marks the bank selector and <code>m3</code> means "only present when the bank reads 3".</li>
          <li>Each voltage is 12 bits at 1.25 mV per bit, so 0 to about 5.1 V. That is coarser than the 100 µV a monitor chip like the LTC6811 measures with: packing three per frame trades resolution for bus load. Your BMS will face the same trade when it reports cells to the VCU or a logger.</li>
          <li>A receiver must check the bank number <b>before</b> trusting the voltages. Decode a bank-3 frame with the bank-0 rule and you will log the wrong cells, with no error anywhere.</li>
        </ul>
      </div>

      <div className="dbc-grid">
        <Card>
          <div className="learn-card-head"><h2>DBC source</h2>
            <div className="btnrow"><button className={preset === 'gm' ? 'active' : ''} onClick={() => load('gm')}>GM battery (opendbc)</button><button className={preset === 'syn' ? 'active' : ''} onClick={() => load('syn')}>Simple teaching file</button></div></div>
          <textarea className="dbc-editor" value={src} onChange={e => { setSrc(e.target.value); setPreset('edited'); }} aria-label="DBC source" spellCheck={false} />
          <small>{messages.length} messages · {messages.reduce((n, m) => n + m.signals.length, 0)} signals parsed{preset === 'gm' ? ' · MIT licence, © comma.ai' : ''}</small>
        </Card>
        <Card>
          {msg ? <>
            <label className="lab-range">Message
              <select value={msg.id} onChange={e => pick(+e.target.value)}>{messages.map(m => <option key={m.id} value={m.id}>0x{m.id.toString(16).toUpperCase()} ({m.id}) · {m.name} · from {m.sender}</option>)}</select></label>
            <label className="lab-range">Raw bytes (hex)
              <input type="text" value={payload} onChange={e => setPayload(e.target.value)} spellCheck={false} /></label>
            {examples[msg.id] && examples[msg.id].length > 1 && <button onClick={nextEx}>Next frame of this message ({ex + 1} of {examples[msg.id].length})</button>}
            {!ok ? <p className="learn-caution">Enter exactly {msg.dlc} hex bytes.</p> : (
              <div className="decoded-table">
                <div><b>SIGNAL</b><b>RAW</b><b>VALUE</b><b>LAYOUT</b></div>
                {sigs.filter(s => s.present).map(s => {
                  const d = decodeSignal(s, bytes); const label = values[`${msg.id}:${s.name}`]?.[d?.rawNumber];
                  return <div key={s.name} className={s.mux === 'M' ? 'sel' : ''}><b>{s.name}{s.mux === 'M' ? ' (selector)' : ''}</b><span>{d?.raw}</span>
                    <strong>{label ? `${d.rawNumber} = ${label}` : `${+d.physical.toFixed(5)} ${s.unit}`}</strong>
                    <small>bit {s.start}, {s.length} bits, {s.littleEndian ? 'Intel' : 'Motorola'}, ×{s.factor}{s.offset ? ` ${s.offset > 0 ? '+' : ''}${s.offset}` : ''}</small></div>;
                })}
                {sigs.some(s => !s.present) && <p className="small">{sigs.filter(s => !s.present).length} other signals belong to other bank numbers and are not in this frame.</p>}
              </div>)}
          </> : <p>No messages parsed.</p>}
          <p className="basis"><span>Example bytes</span>The bytes are made up for this lab, generated from the DBC itself so they decode cleanly. They are not a recording from a car.</p>
        </Card>
      </div>
      <SourceLinks ids={['opendbc', 'cssDbc']} />
    </div>
  );
}

/* ================================================================== */
/* 3. Reverse-engineer a signal                                         */
/* ================================================================== */

// A synthetic recording: 600 frames (6 s at 100 Hz) of one message from a pedal box.
// byte 0: counter (low nibble); bytes 2-3: pedal %, Motorola 12 bits, 0.1 %/bit;
// byte 5 bit 2: brake switch; byte 7: checksum (sum of bytes 0..6, mod 256); others constant.
function recording() {
  const out = [];
  for (let i = 0; i < 600; i += 1) {
    const t = i / 100;
    const pedal = t < 1 ? 0 : t < 2.5 ? (t - 1) / 1.5 * 62 : t < 3.5 ? 62 : t < 4 ? 62 - (t - 3.5) * 124 : 0;
    const brake = t > 4.3 && t < 5.3;
    const p = Math.round(pedal * 10);
    const b = [i % 16, 0x20, (p >> 8) & 0x0f, p & 0xff, 0x00, brake ? 0x04 : 0x00, 0x7a, 0];
    b[7] = b.slice(0, 7).reduce((a, x) => a + x, 0) & 0xff;
    out.push({ t, pedal, brake, b });
  }
  return out;
}

// Background from dark to orange by flip count, with whichever text colour has more contrast.
const lum = c => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
function heat(a) {
  const t = 0.15 + 0.85 * a, from = [10, 25, 40], to = [240, 164, 75];
  const rgb = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  const L = 0.2126 * lum(rgb[0]) + 0.7152 * lum(rgb[1]) + 0.0722 * lum(rgb[2]);
  const onWhite = 1.05 / (L + 0.05), onDark = (L + 0.05) / (0.0067 + 0.05);
  return { background: `rgb(${rgb.join(',')})`, color: onWhite >= onDark ? '#fff' : '#07111d' };
}

export function ReverseLab() {
  const rec = useMemo(recording, []);
  const [win, setWin] = useState([0, 599]);
  const [guess, setGuess] = useState({ byte: 0, len: 8, scale: 1 });
  const slice = rec.slice(win[0], win[1] + 1);
  const flips = Array.from({ length: 64 }, () => 0);
  for (let i = 1; i < slice.length; i += 1) for (let bit = 0; bit < 64; bit += 1) {
    const a = (slice[i - 1].b[bit >> 3] >> (bit & 7)) & 1, c = (slice[i].b[bit >> 3] >> (bit & 7)) & 1;
    if (a !== c) flips[bit] += 1;
  }
  const maxFlip = Math.max(1, ...flips);
  // hypothesis: big-endian value starting at the high byte, `len` bits ending at the low byte's bit 0
  const decode = b => { let v = 0; const nb = Math.ceil(guess.len / 8); for (let k = 0; k < nb; k += 1) v = (v << 8) | (b[guess.byte + k] ?? 0); return (v & ((1 << guess.len) - 1)) * guess.scale; };
  const W = 640, H = 120;
  const path = (f, max) => rec.map((r, i) => `${i ? 'L' : 'M'}${(i / 599 * W).toFixed(1)},${(H - 6 - Math.max(0, Math.min(1, f(r) / max)) * (H - 12)).toFixed(1)}`).join('');
  const segments = [['Whole recording', [0, 599]], ['Pedal pressed and released (1–4 s)', [100, 400]], ['Pedal still, brake tapped (4.3–5.3 s)', [430, 530]], ['Nothing touched (0–1 s)', [0, 99]]];
  // Any width from 10 to 16 bits decodes this recording identically: the pedal never passed 62%,
  // so the field's top bits never moved. That ambiguity is part of the lesson.
  const correct = guess.byte === 2 && guess.len >= 10 && guess.len <= 16 && Math.abs(guess.scale - 0.1) < 1e-9;

  return (
    <div className="learn-page">
      <header className="learn-heading"><div>
        <div className="learn-eyebrow">COMMUNICATION · REVERSE ENGINEERING</div>
        <h1>Find a signal nobody documented</h1>
        <p>Much of opendbc was reverse-engineered by its community, without the manufacturers' documents. People recorded the bus, changed one physical thing at a time, and watched which bits moved. comma.ai's tool for this is called Cabana. You will need the same skill the first time a sensor or charger arrives with no DBC.</p>
      </div></header>

      <div className="why">
        <h2>The method, in four steps</h2>
        <ol>
          <li><b>Record while changing one thing.</b> Press only the pedal, then only the brake.</li>
          <li><b>Look at which bits flip.</b> Bits that flip all the time are counters or checksums. Bits that flip only when you moved something belong to that thing.</li>
          <li><b>Guess a layout.</b> Start byte, length, byte order, scale.</li>
          <li><b>Check the guess against what you physically did.</b> If the decoded curve matches the pedal, write it into the DBC.</li>
        </ol>
      </div>

      <div className="lab-grid">
        <Card>
          <h2>1 · Which bits flip?</h2>
          <div className="assembly-parts">{segments.map(([l, w]) => <button key={l} className={win[0] === w[0] && win[1] === w[1] ? 'active' : ''} onClick={() => setWin(w)}>{l}</button>)}</div>
          <div className="bitgrid" role="table" aria-label="Bit flip counts by byte and bit">
            <div role="row" className="hdr"><span role="columnheader" />{[7, 6, 5, 4, 3, 2, 1, 0].map(b => <span role="columnheader" key={b}>bit {b}</span>)}</div>
            {Array.from({ length: 8 }, (_, byte) => (
              <div role="row" key={byte}><span role="rowheader">byte {byte}</span>{[7, 6, 5, 4, 3, 2, 1, 0].map(bit => {
                const n = flips[byte * 8 + bit];
                return <span role="cell" key={bit} title={`${n} flips`} style={n ? heat(n / maxFlip) : undefined}>{n || ''}</span>;
              })}</div>))}
          </div>
          <p className="small">Number of times each bit changed between consecutive frames in the selected window. The recording is synthetic, built for this lab.</p>
          <details><summary>What should I notice?</summary>
            <p>With nothing touched, only byte 0's low four bits (a counter) and byte 7 (a checksum, which changes whenever anything else does) move. Press the pedal and all of byte 3 lights up, plus the two lowest bits of byte 2: a value that spills over a byte boundary, at least 10 bits wide. The bits above it stay dark only because the pedal never went past 62%. Tap the brake and exactly one bit moves: byte 5, bit 2.</p></details>
        </Card>
        <Card>
          <h2>2 · Test a guess for the pedal</h2>
          <label className="lab-range">Starts at byte<b>{guess.byte}</b><input type="range" min={0} max={6} value={guess.byte} onChange={e => setGuess({ ...guess, byte: +e.target.value })} /></label>
          <label className="lab-range">Length (bits, big-endian)<b>{guess.len}</b><input type="range" min={4} max={16} value={guess.len} onChange={e => setGuess({ ...guess, len: +e.target.value })} /></label>
          <label className="lab-range">Scale (% per bit)<b>{guess.scale}</b>
            <select value={guess.scale} onChange={e => setGuess({ ...guess, scale: +e.target.value })}>{[1, 0.5, 0.25, 0.1, 0.01].map(v => <option key={v} value={v}>{v}</option>)}</select></label>
          <svg viewBox={`0 0 ${W} ${H}`} className="gatechart small" role="img" aria-label="Actual pedal position compared with your decoded guess">
            <path d={path(r => r.pedal, 100)} className="req" /><path d={path(r => decode(r.b), 100)} className="cmd" />
          </svg>
          <span className="legend2"><i className="req" />what the foot did <i className="cmd" />your decode</span>
          <p className={correct ? 'verdict right' : 'verdict'}>{correct ? <><b>Match.</b> But notice that any width from 10 to 16 bits matches too. The pedal never went past 62%, so the field's top bits never moved, and this recording cannot tell you how wide it is. Record a full press to the floor before you commit. In this lab the true layout is 12 bits: <code>SG_ PedalPosition : 19|12@0+ (0.1,0) [0|100] "%"</code>, where Motorola start bit 19 is byte 2, bit 3, the field's most significant bit.</> : 'Adjust until the orange line sits on the dashed one. Hint: count the bits that lit up for the pedal.'}</p>
        </Card>
      </div>
      <p className="basis"><span>Why the counter and checksum matter</span>They are not noise to ignore. A receiver checks that the counter steps by one and the checksum matches, which is exactly how the safety gate lab decides a message can be trusted.</p>
      <SourceLinks ids={['opendbc', 'cabana']} />
    </div>
  );
}
