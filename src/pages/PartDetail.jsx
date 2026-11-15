import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BookOpen, Boxes, FlaskConical, Scale } from 'lucide-react';
import { sources } from '../data/sources.js';
import { labById } from '../data/labs.js';
import { systemById } from '../data/systems.js';
import { T, SourceLinks } from '../ui.jsx';

function Rules({ rules }) {
  if (!rules.length) return null;
  return (
    <section>
      <h3><Scale size={16} /> What the rules require</h3>
      <ul className="rules">
        {rules.map(r => <li key={r.id + r.text}><code>{r.id}</code><span><T>{r.text}</T></span></li>)}
      </ul>
      <SourceLinks ids={[...new Set(rules.map(r => r.source))]} label="Quoted from" />
    </section>
  );
}

function Decision({ d }) {
  return (
    <article className="decision">
      <h3>{d.q}</h3>
      <div className="options">
        {d.options.map(o => (
          <div className="option" key={o.name}>
            <b>{o.name}</b>
            <p className="pro"><span>For</span><em><T>{o.pros}</T></em></p>
            <p className="con"><span>Against</span><em><T>{o.cons}</T></em></p>
          </div>
        ))}
      </div>
      <p className="takeaway"><b>What decides it</b><T>{d.takeaway}</T></p>
      {d.example && <p className="example"><T>{d.example}</T></p>}
      {d.sources ? <SourceLinks ids={d.sources} /> : <p className="basis"><span>Based on</span>General engineering reasoning. No part-specific figures are claimed.</p>}
    </article>
  );
}

function Firmware({ fw }) {
  return (
    <>
      <p className="lead"><T>{fw.intro}</T></p>
      {fw.steps.map(s => (
        <article className="fwstep" key={s.title}>
          <h3>{s.title}</h3>
          <p><T>{s.body}</T></p>
          {s.code && <pre>{s.code}</pre>}
          {s.sources && <SourceLinks ids={s.sources} />}
          {s.principle && <p className="basis"><span>Based on</span>General engineering reasoning. No part-specific figures are claimed.</p>}
        </article>
      ))}
    </>
  );
}

export default function PartDetail({ part }) {
  const tabs = ['What it does', 'Why this design', ...(part.firmware ? ['Firmware'] : []), 'Failures', 'Sources'];
  const [tab, setTab] = useState(tabs[0]);
  useEffect(() => { setTab('What it does'); }, [part.id]);

  const used = new Set();
  part.rules.forEach(r => used.add(r.source));
  part.cases.forEach(c => used.add(c.source));
  part.decisions.forEach(d => (d.sources || []).forEach(s => used.add(s)));
  (part.firmware?.steps || []).forEach(s => (s.sources || []).forEach(x => used.add(x)));

  return (
    <div className="detail">
      <div className="chips">{part.systems.map(id => <Link key={id} to={`/system/${id}/${part.id}`} style={{ '--c': systemById[id].color }}>{systemById[id].short}</Link>)}</div>
      <h2>{part.name}</h2>
      <p className="plain"><T>{part.plain}</T></p>

      <div className="tabs" role="tablist">
        {tabs.map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}{t === 'Why this design' && <i>{part.decisions.length}</i>}</button>)}
      </div>

      {tab === 'What it does' && <>
        <section>
          <h3>How it works</h3>
          <p><T>{part.how}</T></p>
        </section>
        <section className="io">
          <div><h4>Goes in</h4><ul>{part.inputs.map(x => <li key={x}><T>{x}</T></li>)}</ul></div>
          <div><h4>Comes out</h4><ul>{part.outputs.map(x => <li key={x}><T>{x}</T></li>)}</ul></div>
        </section>
        <section>
          <h3>Connections</h3>
          <ul className="plainlist">{part.interfaces.map(x => <li key={x}><T>{x}</T></li>)}</ul>
        </section>
        <Rules rules={part.rules} />
        {part.cases.length > 0 && <section>
          <h3><Boxes size={16} /> On real cars</h3>
          {part.cases.map(c => (
            <p className="case" key={c.team + c.text}><b>{c.team}</b><T>{c.text}</T> <a href={sources[c.source].url} target="_blank" rel="noreferrer">source</a></p>
          ))}
        </section>}
        {(part.labs.length > 0 || part.inside) && <section>
          <h3><FlaskConical size={16} /> Try it</h3>
          <div className="lablinks">
            {part.labs.map(id => <Link key={id} to={`/labs/${id}`}><b>{labById[id].name}</b><span>{labById[id].blurb}</span><ArrowRight size={16} /></Link>)}
            {part.inside && !part.labs.includes('assemblies') && <Link to="/labs/assemblies"><b>Look inside</b><span>Exploded 3D view of this assembly.</span><ArrowRight size={16} /></Link>}
          </div>
        </section>}
        <button className="nexttab" onClick={() => setTab('Why this design')}>Next: why it is designed this way <ArrowRight size={16} /></button>
      </>}

      {tab === 'Why this design' && <>
        <p className="lead">Every part is a choice between alternatives. These are the questions a design review would ask.</p>
        {part.decisions.map(d => <Decision key={d.q} d={d} />)}
      </>}

      {tab === 'Firmware' && <Firmware fw={part.firmware} />}

      {tab === 'Failures' && <>
        <p className="lead">Failure modes a designer has to plan for, and a tester has to be able to provoke.</p>
        <ul className="failures">{part.failures.map(x => <li key={x}><AlertTriangle size={15} /><span><T>{x}</T></span></li>)}</ul>
        <section><h3>Design note</h3><p><T>{part.design}</T></p></section>
      </>}

      {tab === 'Sources' && <>
        <p className="lead">Where the facts on these tabs come from. Team implementations describe one car only.</p>
        <ul className="sourcelist">
          {[...used].map(id => (
            <li key={id}><BookOpen size={15} />
              <div><a href={sources[id].url} target="_blank" rel="noreferrer">{sources[id].title}</a>
                <small>{sources[id].org} · {sources[id].kind} · checked {sources[id].checked}</small>
                {sources[id].note && <small>{sources[id].note}</small>}</div>
            </li>
          ))}
        </ul>
        {used.size === 0 && <p>This page uses general engineering reasoning only and quotes no part-specific figures.</p>}
        {part.reference && <p className="basis"><span>Note</span>{part.reference}</p>}
      </>}
    </div>
  );
}
