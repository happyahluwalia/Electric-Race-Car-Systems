import React, { Suspense, lazy, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { labs, labById } from '../data/labs.js';
import { glossary } from '../data/glossary.js';
import { sources } from '../data/sources.js';
import { components } from '../data/components.js';

const wb = name => lazy(() => import('../labs/workbenches.jsx').then(m => ({ default: m[name] })));
const lg = name => lazy(() => import('../labs/legacy.jsx').then(m => ({ default: m[name] })));
const bt = name => lazy(() => import('../labs/battery-labs.jsx').then(m => ({ default: m[name] })));
const labComponents = {
  pack: bt('PackLab'), frame: bt('FrameLab'), bms: wb('BmsWorkbench'), precharge: wb('EngineeringLabs'),
  powertrain: wb('PowertrainWorkbench'), assemblies: wb('AssemblyExplorer'), vcu: wb('VcuWorkbench'),
  simulation: lg('Simulation'), pinout: wb('EcuPinoutExplorer'), dbc: wb('DbcWorkbench'), can: lg('CanLab'),
  nets: wb('ElectricalNetExplorer')
};

export function Labs() {
  const { lab } = useParams();
  if (lab) {
    const L = labComponents[lab];
    if (!L) return <div className="notfound"><h2>No such lab.</h2><Link to="/labs">All labs</Link></div>;
    const related = components.filter(c => c.labs.includes(lab));
    return (
      <div className="page labpage">
        <div className="labbar">
          <Link to="/labs"><ArrowLeft size={16} /> All labs</Link>
          {related.length > 0 && <span>Teaches: {related.map(c => <Link key={c.id} to={`/part/${c.id}`}>{c.label}</Link>)}</span>}
        </div>
        <Suspense fallback={<p className="loading">Loading lab…</p>}><L /></Suspense>
      </div>
    );
  }
  const groups = [...new Set(labs.map(l => l.group))];
  return (
    <div className="page">
      <h1>Labs</h1>
      <p className="lead">Hands-on exercises. Each one changes numbers and shows consequences. Values are illustrative unless a source is named.</p>
      {groups.map(g => (
        <section key={g}>
          <h2>{g}</h2>
          <div className="labgrid">
            {labs.filter(l => l.group === g).map(l => <Link key={l.id} to={`/labs/${l.id}`}><b>{l.name}</b><span>{l.blurb}</span><ArrowRight size={16} /></Link>)}
          </div>
        </section>
      ))}
    </div>
  );
}

export function Glossary() {
  const [q, setQ] = useState('');
  const rows = glossary.filter(g => (g.term + ' ' + g.meaning).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="page narrow">
      <h1>Glossary</h1>
      <p className="lead">The abbreviations you will meet. Anywhere in the explorer, a dotted underline means you can hover for the meaning.</p>
      <input className="filter" value={q} onChange={e => setQ(e.target.value)} placeholder="Filter, for example BMS or shutdown" aria-label="Filter glossary" />
      <dl className="glossary">{rows.map(g => <div key={g.term}><dt>{g.term}</dt><dd>{g.meaning}</dd></div>)}</dl>
      {rows.length === 0 && <p>Nothing matches "{q}".</p>}
      <p className="basis"><span>Naming</span>Rulebooks differ. Before 2027 Formula SAE said AMS, accumulator, segment and AIR; the 2027 edition says BMS, tractive battery, module and isolation relay. Most team write-ups still use the old words. Use the words in the rules for your event.</p>
    </div>
  );
}

export function Sources() {
  const kinds = [...new Set(Object.values(sources).map(s => s.kind))];
  const usedBy = id => components.filter(c => JSON.stringify([c.rules, c.cases, c.decisions, c.firmware || {}]).includes(`"${id}"`));
  return (
    <div className="page narrow">
      <h1>Sources</h1>
      <p className="lead">Every rule value, part number and datasheet figure in the explorer points at one of these. A test in the repository fails the build if a claim has no source.</p>
      <div className="rulesnote">
        <b>How to read the content</b>
        <p>Three kinds of statement appear, and they are labelled differently. <strong>Rules</strong> are quoted with their rule number from one named edition. <strong>Datasheet figures and team implementations</strong> link to the document. <strong>General engineering reasoning</strong> is marked as such and quotes no part-specific numbers.</p>
      </div>
      {kinds.map(k => (
        <section key={k}>
          <h2>{k}</h2>
          <ul className="sourcelist big">
            {Object.entries(sources).filter(([, s]) => s.kind === k).map(([id, s]) => (
              <li key={id}><div>
                <a href={s.url} target="_blank" rel="noreferrer">{s.title} <ExternalLink size={13} /></a>
                <small>{s.org} · checked {s.checked}</small>
                {s.note && <small>{s.note}</small>}
                <small className="usedby">Used by: {usedBy(id).map(c => <Link key={c.id} to={`/part/${c.id}`}>{c.label}</Link>)}{usedBy(id).length === 0 && 'labs and system pages'}</small>
              </div></li>
            ))}
          </ul>
        </section>
      ))}
      <div className="rulesnote warn">
        <b>Safety</b>
        <p>This is learning material. It is not a wiring instruction, a high-voltage work procedure or a rules-compliance check. High-voltage systems can kill. Real work needs qualified supervision, the manufacturer's documentation and the current rules for your event.</p>
      </div>
    </div>
  );
}
