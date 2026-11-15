import React, { useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { pec15, commandFrame, ltc6811Adcv, cellVolts, hex } from '../lib/pec.js';
import { sizePack, limits2027 } from '../lib/pack.js';
import { SourceLinks } from '../ui.jsx';
import './labs.css';

const Card = ({ children }) => <section className="learn-card">{children}</section>;

/* ------------------------------------------------------------------ */
/* Pack sizing                                                         */
/* ------------------------------------------------------------------ */

// Molicel INR-21700-P45B data sheet: 4500 mAh typical, 3.6 V nominal, 4.2 V charge,
// 2.5 V discharge cut-off, 45 A continuous (80 °C cut-off), 70 g max.
const P45B = { vMax: 4.2, vNom: 3.6, vMin: 2.5, ah: 4.5, aCont: 45, massG: 70 };

export function PackLab() {
  const [cell, setCell] = useState(P45B);
  const [cfg, setCfg] = useState({ series: 140, parallel: 4, modules: 7 });
  const r = sizePack(cell, cfg);
  const num = (obj, set, key, label, unit, step, min, max) => (
    <label className="lab-range" key={key}>{label}<b>{obj[key]} {unit}</b>
      <input type="range" min={min} max={max} step={step} value={obj[key]} onChange={e => set({ ...obj, [key]: +e.target.value })} />
    </label>
  );
  return (
    <div className="learn-page">
      <header className="learn-heading"><div>
        <div className="learn-eyebrow">BATTERY · PACK SIZING</div>
        <h1>How many cells, arranged how?</h1>
        <p>Series count sets voltage. Parallel count sets current and energy. Modules (older rulebooks: segments) keep each serviceable block under the per-module limits of 120 V, 6 MJ and 12 kg. Move the sliders until every check passes, then try to break one at a time.</p>
      </div></header>
      <div className="lab-grid">
        <Card>
          <div className="learn-card-head"><h2>Pack layout</h2>
            <button onClick={() => { setCell(P45B); setCfg({ series: 140, parallel: 4, modules: 7 }); }}><RotateCcw /> Reset</button></div>
          {num(cfg, setCfg, 'series', 'Cells in series', '', 1, 20, 160)}
          {num(cfg, setCfg, 'parallel', 'Cells in parallel', '', 1, 1, 10)}
          {num(cfg, setCfg, 'modules', 'Modules', '', 1, 1, 12)}
          <h3>Cell (starts as the Molicel P45B data sheet values)</h3>
          {num(cell, setCell, 'vMax', 'Full-charge voltage', 'V', 0.05, 3.4, 4.4)}
          {num(cell, setCell, 'vNom', 'Nominal voltage', 'V', 0.05, 3.0, 3.9)}
          {num(cell, setCell, 'vMin', 'Cut-off voltage', 'V', 0.05, 2.0, 3.2)}
          {num(cell, setCell, 'ah', 'Capacity', 'Ah', 0.1, 1, 10)}
          {num(cell, setCell, 'aCont', 'Continuous discharge rating', 'A', 1, 5, 80)}
          {num(cell, setCell, 'massG', 'Cell mass', 'g', 1, 30, 120)}
        </Card>
        <Card>
          <div className="learn-eyebrow">RESULT</div>
          <h2>{cfg.series}s{cfg.parallel}p · {r.cells} cells · {(r.energyWh / 1000).toFixed(2)} kWh</h2>
          <div className="lab-result">
            <span>Full <b>{r.vMax.toFixed(0)} V</b></span>
            <span>Nominal <b>{r.vNom.toFixed(0)} V</b></span>
            <span>Empty <b>{r.vMin.toFixed(0)} V</b></span>
          </div>
          <div className="lab-result">
            <span>Per module <b>{r.modVMax.toFixed(1)} V</b></span>
            <span>Module energy <b>{r.modEnergyMJ.toFixed(2)} MJ</b></span>
            <span>Module cell mass <b>{r.modCellMassKg.toFixed(1)} kg</b></span>
            <span>Pack current at 80 kW <b>{r.packAmpsAtLimit.toFixed(0)} A</b></span>
          </div>
          <div className="validity-list">
            {r.checks.map(c => <p key={c.label}>{c.label}<b className={c.ok ? 'good' : 'bad'}>{c.ok ? 'PASS' : 'FAIL'} · {c.detail}</b></p>)}
          </div>
          <div className="chain-detail">
            <h3>What to notice</h3>
            <p>As the pack empties its voltage falls, so the same 80 kW needs more current. The last check is the one that catches designs that look fine at nominal voltage.</p>
          </div>
        </Card>
      </div>
      <p className="learn-footnote"><Info /> Limits used: {limits2027.maxVoltage} V, {limits2027.maxPowerKw} kW, and {limits2027.moduleVoltage} V, {limits2027.moduleEnergyMJ} MJ and {limits2027.moduleMassKg} kg per module, from Formula SAE Rules 2027 (EV.3.3.1, EV.3.3.2, EV.5.1.1). Module energy follows the rule's definition: maximum stack voltage × nominal capacity. The mass check counts cells only; a real module adds housing, busbars and the monitor board. This checks arithmetic only and ignores voltage sag under load, cell heating and busbar ratings.</p>
      <SourceLinks ids={['fsae2027', 'p45b']} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cell-monitor frame builder                                          */
/* ------------------------------------------------------------------ */

const commands = [
  { name: 'WRCFGA', code: 0x001, what: 'Write configuration register group A. Followed by six data bytes and their error check.' },
  { name: 'RDCFGA', code: 0x002, what: 'Read configuration register group A back, to confirm the write took.' },
  { name: 'RDCVA', code: 0x004, what: 'Read cell voltage register group A: cells 1 to 3.' },
  { name: 'RDCVB', code: 0x006, what: 'Read cell voltage register group B: cells 4 to 6.' },
  { name: 'ADCV (LTC6811)', code: null, what: 'Start a cell voltage conversion. The code is built from option bits.' }
];
const modes = [['01', '27 kHz (fast)', 1], ['10', '7 kHz (normal)', 2], ['11', '26 Hz (filtered)', 3]];

function traceBits(bytes) {
  // one row per input bit, for the first command byte pair
  let rem = 0x0010; const rows = [];
  for (const byte of bytes) for (let bit = 7; bit >= 0; bit -= 1) {
    const din = (byte >> bit) & 1; const in0 = din ^ ((rem >> 14) & 1);
    rem = (rem << 1) & 0x7fff; if (in0) rem ^= 0x4599;
    rows.push({ din, rem });
  }
  return rows;
}

export function FrameLab() {
  const [idx, setIdx] = useState(0);
  const [md, setMd] = useState(2), [dcp, setDcp] = useState(0);
  const [chip, setChip] = useState('ltc6811');
  const [lo, setLo] = useState('E8'), [hi, setHi] = useState('80');
  const [corrupt, setCorrupt] = useState(false);
  const cmd = commands[idx];
  const code = cmd.code ?? ltc6811Adcv({ md, dcp, ch: 0 });
  const frame = commandFrame(code);
  const sent = corrupt ? [frame[0], frame[1] ^ 0x08, frame[2], frame[3]] : frame;
  const check = pec15(sent.slice(0, 2));
  const accepted = check === ((sent[2] << 8) | sent[3]);
  const rows = traceBits(frame.slice(0, 2));
  const loN = parseInt(lo, 16), hiN = parseInt(hi, 16);
  const valid = /^[0-9a-f]{1,2}$/i.test(lo) && /^[0-9a-f]{1,2}$/i.test(hi);
  const volts = valid ? cellVolts(chip, loN, hiN) : undefined;
  return (
    <div className="learn-page">
      <header className="learn-heading"><div>
        <div className="learn-eyebrow">BATTERY · DRIVER LEVEL</div>
        <h1>Build a cell-monitor command frame</h1>
        <p>This is the first thing a BMS driver has to get right. Every command to an LTC6811 or ADBMS6830B is two command bytes followed by a 15-bit error check. If the check is wrong the chip ignores the command and says nothing.</p>
      </div></header>
      <div className="lab-grid">
        <Card>
          <div className="learn-eyebrow">1 · CHOOSE A COMMAND</div>
          <div className="assembly-parts">{commands.map((c, i) => <button key={c.name} className={i === idx ? 'active' : ''} onClick={() => setIdx(i)}>{c.name}</button>)}</div>
          <p>{cmd.what}</p>
          {cmd.code == null && <>
            <div className="assembly-parts">{modes.map(([bits, label, v]) => <button key={bits} className={md === v ? 'active' : ''} onClick={() => setMd(v)}>MD={bits} · {label}</button>)}</div>
            <div className="toggle-grid"><label><input type="checkbox" checked={!!dcp} onChange={e => setDcp(e.target.checked ? 1 : 0)} /> DCP: allow balancing during the conversion</label></div>
            <p>Bit layout: 0 1 MD1 MD0 1 1 DCP 0 CH2 CH1 CH0, with CH = 000 for all cells.</p>
          </>}
          <div className="learn-eyebrow">2 · THE FOUR BYTES ON THE WIRE</div>
          <div className="dbc-bytes frame-bytes">
            {['CMD0', 'CMD1', 'PEC0', 'PEC1'].map((n, i) => <div key={n} className={i > 1 ? 'pec' : ''}>{n}<b>{hex(sent[i])}</b></div>)}
          </div>
          <p>Command code 0x{hex(code, 3)}. The two error-check bytes are the 15-bit remainder shifted left by one, so the last bit is always 0.</p>
          <div className="toggle-grid"><label><input type="checkbox" checked={corrupt} onChange={e => setCorrupt(e.target.checked)} /> Flip one bit in CMD1 on its way to the chip</label></div>
          <div className="bms-state">
            <small>WHAT THE CHIP DOES</small>
            <b className={accepted ? 'good' : 'bad'}>{accepted ? 'ERROR CHECK MATCHES · COMMAND ACCEPTED' : 'ERROR CHECK FAILS · COMMAND IGNORED'}</b>
            <p>{accepted ? 'The chip recomputes the check over CMD0 and CMD1 and gets the same value you sent.' : `The chip computes 0x${hex(check, 4)} over the bytes it received, which does not match 0x${hex((sent[2] << 8) | sent[3], 4)}. It does nothing, and your next read returns stale or cleared data. This is why the driver must also check the error code on everything it reads.`}</p>
          </div>
        </Card>
        <Card>
          <div className="learn-eyebrow">HOW THE ERROR CHECK IS COMPUTED</div>
          <h2>One shift per input bit</h2>
          <p>Start with the register at 000000000010000. For each bit, most significant first: XOR it with the top register bit, shift left, and if that XOR was 1, XOR the register with the polynomial 0x4599.</p>
          <div className="pec-trace">
            <div><b>bit</b><b>in</b><b>register after</b></div>
            {rows.map((row, i) => <div key={i}><span>{i + 1}</span><span>{row.din}</span><code>{row.rem.toString(2).padStart(15, '0')}</code></div>)}
          </div>
          <p>Final register 0x{hex(rows[rows.length - 1].rem, 4)}, shifted left one place: 0x{hex(pec15(frame.slice(0, 2)), 4)}.</p>
        </Card>
      </div>
      <Card>
        <div className="learn-eyebrow">3 · DECODE WHAT COMES BACK</div>
        <h2>Two register bytes to one cell voltage</h2>
        <p>A read returns six data bytes per group: three cells, low byte first. Type the two bytes for one cell.</p>
        <div className="decode-row">
          <div className="assembly-parts">
            <button className={chip === 'ltc6811' ? 'active' : ''} onClick={() => { setChip('ltc6811'); setLo('E8'); setHi('80'); }}>LTC6811</button>
            <button className={chip === 'adbms6830b' ? 'active' : ''} onClick={() => { setChip('adbms6830b'); setLo('E0'); setHi('2E'); }}>ADBMS6830B</button>
          </div>
          <label>Low byte<input value={lo} maxLength={2} onChange={e => setLo(e.target.value)} /></label>
          <label>High byte<input value={hi} maxLength={2} onChange={e => setHi(e.target.value)} /></label>
          <div className="bms-state">
            <small>{chip === 'ltc6811' ? 'V = code × 100 µV' : 'V = signed code × 150 µV + 1.5 V'}</small>
            <b className={volts == null ? 'bad' : 'good'}>{!valid ? 'Enter two hex bytes' : volts === null ? 'NO DATA (cleared register)' : `${volts.toFixed(4)} V`}</b>
          </div>
        </div>
        <p>Try FF FF on the LTC6811 and 00 80 on the ADBMS6830B. Those are the values a cleared register holds. A driver that converts them to a voltage will report a cell at 6.55 V or −3.42 V; a correct driver reports "no data".</p>
      </Card>
      <p className="learn-footnote"><Info /> The polynomial, initial value, command codes and conversion formulas are from the LTC6811 and ADBMS6830B data sheets. The calculation here is unit-tested against the data sheet's worked example (0x0001 gives 0x3D6E). The ADBMS6830B uses a different 10-bit check on read data, which this lab does not compute.</p>
      <SourceLinks ids={['ltc6811', 'adbms6830b']} />
    </div>
  );
}
