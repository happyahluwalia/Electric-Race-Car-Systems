import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { paths, pathById } from '../data/paths.js';
import { componentById } from '../data/components.js';
import { systemById } from '../data/systems.js';
import { journeyById } from '../data/journeys.js';
import { labById } from '../data/labs.js';

// Progress is a per-browser convenience; it can come back empty and that is fine.
const KEY = 'evx-path-progress';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

export function stepTarget(s) {
  if (s.kind === 'system') return { to: `/system/${s.id}`, label: systemById[s.id].name, tag: 'System' };
  if (s.kind === 'part') { const c = componentById[s.id]; return { to: `/system/${c.systems[0]}/${s.id}`, label: c.name, tag: 'Part' }; }
  if (s.kind === 'journey') return { to: `/journey/${s.id}`, label: journeyById[s.id].name, tag: 'Journey' };
  return { to: `/labs/${s.id}`, label: labById[s.id].name, tag: 'Lab' };
}

export function Paths() {
  const { pid } = useParams();
  const [done, setDone] = useState(load);
  const toggle = (p, i) => { const k = `${p}:${i}`; const next = { ...done, [k]: !done[k] }; setDone(next); save(next); };
  const count = p => p.steps.filter((_, i) => done[`${p.id}:${i}`]).length;

  if (pid) {
    const p = pathById[pid];
    if (!p) return <div className="notfound"><h2>No such path.</h2><Link to="/paths">All paths</Link></div>;
    return (
      <div className="page">
        <div className="labbar"><Link to="/paths"><ArrowLeft size={16} /> All paths</Link><span>{count(p)} of {p.steps.length} done</span></div>
        <h1>{p.name}</h1>
        <p className="lead">{p.who} {p.time}. Work down the list; tick each step when you can explain it to someone else. Every part page ends with a short self-check.</p>
        <ol className="pathsteps">
          {p.steps.map((s, i) => {
            const t = stepTarget(s); const on = !!done[`${p.id}:${i}`];
            return (
              <li key={i} className={on ? 'done' : ''}>
                <button className="tick" aria-pressed={on} aria-label={`Mark step ${i + 1} ${on ? 'not done' : 'done'}`} onClick={() => toggle(p.id, i)}>{on ? <CheckCircle2 size={20} /> : <Circle size={20} />}</button>
                <Link to={t.to}><small>{i + 1} · {t.tag}</small><b>{t.label}</b><span>{s.why}</span><ArrowRight size={16} /></Link>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }
  return (
    <div className="page">
      <h1>Learning paths</h1>
      <p className="lead">Pick the path that matches what you need to do. Each one is an ordered tour through parts, journeys and labs that already exist in the explorer.</p>
      <div className="labgrid">
        {paths.map(p => <Link key={p.id} to={`/paths/${p.id}`}><b>{p.name}</b><span>{p.who} {p.steps.length} steps, {p.time.toLowerCase()}. {count(p) ? `${count(p)} done.` : ''}</span><ArrowRight size={16} /></Link>)}
      </div>
    </div>
  );
}
