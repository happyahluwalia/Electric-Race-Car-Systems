import React, { useState } from 'react';
import { Info, RotateCcw } from 'lucide-react';
import { broadcast, decodeBroadcast, decodeFaults, decodeStates, encodeCommand, decodeCommand, hexBytes, parseBytes } from '../lib/cascadia.js';
import { SourceLinks } from '../ui.jsx';
import './labs.css';

const Card = ({ children }) => <section className="learn-card">{children}</section>;
const Bytes = ({ bytes, labels }) => (
  <div className="dbc-bytes">{bytes.map((b, i) => <div key={i}><small>{labels ? labels[i] : `BYTE ${i}`}</small><b>{b.toString(16).padStart(2, '0').toUpperCase()}</b></div>)}</div>
);

const samples = {
  0x0A7: '3C 0F 2A 0E 10 05 D0 07',
  0x0A5: '08 07 38 FF F4 01 00 00',
  0x0A6: 'F6 FF 0A 00 00 00 2C 01',
  0x0A0: '9A 01 A4 01 9E 01 72 01',
  0x0A2: '00 00 00 00 1A 02 00 00',
  0x0AC: '7D 00 78 00 10 27 00 00',
  0x0AB: '00 00 00 00 00 00 00 00',
  0x0AA: '05 00 06 01 01 00 01 01'
};
const cmdLabels = ['TORQUE lo', 'TORQUE hi', 'SPEED lo', 'SPEED hi', 'DIRECTION', 'FLAGS', 'LIMIT lo', 'LIMIT hi'];

export function InverterFrameLab() {
  const [cmd, setCmd] = useState({ torqueNm: 12.5, direction: 1, enable: true, discharge: false, speedMode: false, torqueLimNm: 0 });
  const [state, setState] = useState('drive');
  const [id, setId] = useState(0x0A7);
  const [hex, setHex] = useState(samples[0x0A7]);
  const [age, setAge] = useState(40);

  // What a VCU actually puts on the bus depends on its state, not just the pedal.
  const sent = state === 'drive' ? cmd
    : state === 'lockout' ? { ...cmd, torqueNm: 0, enable: false }
    : state === 'discharge' ? { torqueNm: 0, direction: cmd.direction, enable: false, discharge: true }
    : { torqueNm: 0, direction: 0, enable: false };
  const bytes = encodeCommand(sent);
  const back = decodeCommand(bytes);

  const raw = parseBytes(hex);
  const ok = raw.length === 8 && raw.every(b => !Number.isNaN(b));
  const decoded = ok ? (id === 0x0AB ? decodeFaults(raw) : id === 0x0AA ? decodeStates(raw) : decodeBroadcast(id, raw)) : null;
  const fresh = age <= 250;

  const num = (key, label, unit, step, min, max) => (
    <label className="lab-range" key={key}>{label}<b>{cmd[key]} {unit}</b>
      <input type="range" min={min} max={max} step={step} value={cmd[key]} onChange={e => setCmd({ ...cmd, [key]: +e.target.value })} />
    </label>
  );
  return (
    <div className="learn-page">
      <header className="learn-heading"><div>
        <div className="learn-eyebrow">COMMUNICATION · DRIVER LEVEL</div>
        <h1>Talk to a traction inverter over CAN</h1>
        <p>A Cascadia Motion inverter broadcasts its state in a set of frames and listens for one command frame. The byte layouts below are the ones two public Formula SAE drivers use, so this lab decodes real fields. Confirm the layout against the manufacturer's protocol document for your firmware version before you ship anything.</p>
      </div></header>
      <div className="lab-grid">
        <Card>
          <div className="learn-eyebrow">1 · BUILD THE COMMAND FRAME (ID 0x0C0)</div>
          {num('torqueNm', 'Torque request', 'Nm', 0.5, 0, 230)}
          <div className="toggle-grid">
            <label><input type="checkbox" checked={cmd.direction === 1} onChange={e => setCmd({ ...cmd, direction: e.target.checked ? 1 : 0 })} /> Direction forward (1)</label>
            <label><input type="checkbox" checked={cmd.enable} onChange={e => setCmd({ ...cmd, enable: e.target.checked })} /> Inverter enable (flag bit 0)</label>
          </div>
          <div className="learn-eyebrow">VCU STATE</div>
          <div className="assembly-parts">
            {[['drive', 'Ready to drive'], ['lockout', 'Clearing enable lockout'], ['discharge', 'Discharge mode'], ['faulted', 'Fault or not ready']].map(([k, l]) => (
              <button key={k} className={state === k ? 'active' : ''} onClick={() => setState(k)}>{l}</button>
            ))}
          </div>
          <p>{{
            drive: 'Torque is sent only while the vehicle state machine is in drive and the pedal checks pass.',
            lockout: 'The inverter powers up with an enable lockout. Both drivers clear it by sending a disable command (torque 0, enable 0) before the first enable, which is what this state sends.',
            discharge: 'Discharge mode bleeds the DC link through the inverter. ev-ecu refuses to set it while the inverter is enabled, so this frame has enable 0 and discharge 1.',
            faulted: 'USC publishes an all-zero "free roll" command whenever the car is not in drive, the pedal check fails, or the inverter fault status is stale or non-zero. Silence is not an option: the inverter also times out on missing commands.'
          }[state]}</p>
          <Bytes bytes={bytes} labels={cmdLabels} />
          <div className="lab-result">
            <span>Torque <b>{back.torqueNm} Nm</b> (0.1 Nm units, signed)</span>
            <span>Direction <b>{back.direction}</b></span>
            <span>Enable <b>{back.enable ? 1 : 0}</b></span>
            <span>Discharge <b>{back.discharge ? 1 : 0}</b></span>
            <span>Torque limit <b>{back.torqueLimNm === 0 ? '0 = use inverter EEPROM limits' : back.torqueLimNm + ' Nm'}</b></span>
          </div>
          <div className="chain-detail">
            <h3>Send it again</h3>
            <p>USC re-sends the command at least every 100 ms even when the torque has not changed, and rate-limits how fast the request may rise from one cycle to the next. A command bus is a heartbeat as much as a value.</p>
          </div>
        </Card>
        <Card>
          <div className="learn-eyebrow">2 · DECODE A BROADCAST FRAME</div>
          <div className="assembly-parts">
            {Object.keys(samples).map(k => +k).map(k => (
              <button key={k} className={id === k ? 'active' : ''} onClick={() => { setId(k); setHex(samples[k]); }}>
                0x{k.toString(16).toUpperCase().padStart(3, '0')} {k === 0x0AB ? 'Fault codes' : k === 0x0AA ? 'Internal states' : broadcast[k].name}
              </button>
            ))}
          </div>
          <label className="lab-range">Eight data bytes, hex
            <input type="text" value={hex} onChange={e => setHex(e.target.value)} spellCheck={false} style={{ fontFamily: 'ui-monospace, Menlo, monospace' }} />
          </label>
          {ok ? <Bytes bytes={raw} /> : <p>Enter exactly eight hex bytes.</p>}
          {decoded && id === 0x0AB && (
            <div className="validity-list">
              <p>POST fault word<b className={decoded.postFault ? 'bad' : 'good'}>0x{decoded.postFault.toString(16).padStart(8, '0').toUpperCase()}</b></p>
              <p>Run fault word<b className={decoded.runFault ? 'bad' : 'good'}>0x{decoded.runFault.toString(16).padStart(8, '0').toUpperCase()}</b></p>
              <p>Any bit set means fault<b className={decoded.any ? 'bad' : 'good'}>{decoded.any ? 'FAULT: send free roll, disable' : 'no fault'}</b></p>
            </div>
          )}
          {decoded && id === 0x0AA && (
            <div className="validity-list">
              {Object.entries(decoded).map(([k, v]) => <p key={k}>{k}<b>{v}</b></p>)}
            </div>
          )}
          {decoded && decoded.fields && (
            <div className="validity-list">
              {decoded.fields.map(f => <p key={f.label}>{f.label}<b>raw {f.raw} → {f.value} {f.unit}</b></p>)}
            </div>
          )}
          <div className="learn-eyebrow">3 · IS IT FRESH?</div>
          <label className="lab-range">Age of the last fault-status frame<b>{age} ms</b>
            <input type="range" min={0} max={600} step={10} value={age} onChange={e => setAge(+e.target.value)} />
          </label>
          <div className="validity-list">
            <p>USC: stale after 250 ms<b className={fresh ? 'good' : 'bad'}>{fresh ? 'fresh: torque may be sent' : 'stale: treat as unsafe, send free roll'}</b></p>
            <p>ev-ecu: inverter CAN timeout is fault 0x00000001<b className={fresh ? 'good' : 'bad'}>{fresh ? 'no fault' : 'LV system fault, state machine to fault'}</b></p>
          </div>
          <button onClick={() => { setCmd({ torqueNm: 12.5, direction: 1, enable: true, discharge: false, speedMode: false, torqueLimNm: 0 }); setState('drive'); setId(0x0A7); setHex(samples[0x0A7]); setAge(40); }}><RotateCcw /> Reset</button>
        </Card>
      </div>
      <p className="learn-footnote"><Info /> Layouts and scaling are taken from lflaherty/ev-ecu (cInverterCAN.h, dataConversions.h) and SCFormulaElectric/vcu_stm32 (can_protocol.h, motor_controller_task.c). Sample bytes are made up to exercise the decoder; they are not recordings from a car. State numbers in 0x0AA are shown raw because their meaning is defined in the manufacturer's document.</p>
      <SourceLinks ids={['evEcu', 'uscVcu']} />
    </div>
  );
}
