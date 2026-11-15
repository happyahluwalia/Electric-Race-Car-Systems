import React, { Component, Suspense, lazy, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronRight, FlaskConical, Route as RouteIcon, RotateCcw } from 'lucide-react';
import { systems, systemById } from '../data/systems.js';
import { components, componentById } from '../data/components.js';
import { journeys, journeyById } from '../data/journeys.js';
import { labById } from '../data/labs.js';
import { T, SourceLinks } from '../ui.jsx';
import PartDetail from './PartDetail.jsx';

const CarScene = lazy(() => import('../scene/CarScene.jsx'));

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <div className="scene-fallback">The 3D view could not start on this device. Everything is still reachable from the lists on the left.</div>
      : this.props.children;
  }
}

/* ---------- left rail ---------- */

function Rail({ system, journey, partId, stepIndex }) {
  return (
    <nav className="rail" aria-label="Systems and journeys">
      <h2>Systems</h2>
      <Link to="/" className={!system && !journey && !partId ? 'row on' : 'row'}><i className="dot all" />Whole car</Link>
      {systems.map(s => (
        <React.Fragment key={s.id}>
          <Link to={`/system/${s.id}`} className={system?.id === s.id ? 'row on' : 'row'} style={{ '--c': s.color }}>
            <i className="dot" />{s.name}<small>{s.parts.length}</small>
          </Link>
          {system?.id === s.id && (
            <ol className="parts">
              {s.parts.map((id, i) => (
                <li key={id}><Link to={`/system/${s.id}/${id}`} className={partId === id ? 'on' : ''}><b>{i + 1}</b>{componentById[id].label}</Link></li>
              ))}
            </ol>
          )}
        </React.Fragment>
      ))}
      <h2>Journeys</h2>
      {journeys.map(j => (
        <React.Fragment key={j.id}>
          <Link to={`/journey/${j.id}`} className={journey?.id === j.id ? 'row on' : 'row'}><RouteIcon size={15} />{j.name}<small>{j.steps.length}</small></Link>
          {journey?.id === j.id && (
            <ol className="parts">
              {j.steps.map((st, i) => (
                <li key={i}><Link to={`/journey/${j.id}/${i + 1}`} className={stepIndex === i ? 'on' : ''}><b>{i + 1}</b>{st.title}</Link></li>
              ))}
            </ol>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/* ---------- right panel states ---------- */

function Welcome() {
  return (
    <div className="detail">
      <h2>How an electric race car works</h2>
      <p className="plain">Learn it the way you would learn anatomy: one system at a time. Pick a system and everything else fades away.</p>
      <ol className="howto">
        <li><b>Pick a system</b> on the left. Its parts light up, numbered in the order worth learning them.</li>
        <li><b>Click a part</b> in the model or the list to see what it does, why it was chosen over the alternatives, and what the rules demand.</li>
        <li><b>Follow a journey</b> to watch one event, such as pressing the pedal, travel across several systems.</li>
      </ol>
      <h3>Where to start</h3>
      <div className="lablinks">
        <Link to="/system/hv"><b>New to electric cars</b><span>Start with the energy path, from one cell to the wheels.</span><ArrowRight size={16} /></Link>
        <Link to="/journey/startup"><b>Want the big picture</b><span>Watch what happens between the master switch and ready-to-drive.</span><ArrowRight size={16} /></Link>
        <Link to="/system/bms/cellmonitor"><b>Writing battery firmware</b><span>Go straight to the cell monitors and the driver walkthrough.</span><ArrowRight size={16} /></Link>
      </div>
      <h3>The eight systems</h3>
      <ul className="syslist">
        {systems.map(s => <li key={s.id}><Link to={`/system/${s.id}`} style={{ '--c': s.color }}><i className="dot" /><span><b>{s.name}</b>{s.question}</span><ChevronRight size={16} /></Link></li>)}
      </ul>
      <p className="basis"><span>Scope</span>This is a teaching car assembled from public sources. It is not any team's vehicle, and it is not a wiring or safety reference.</p>
    </div>
  );
}

function SystemIntro({ system }) {
  return (
    <div className="detail">
      <div className="chips"><span style={{ '--c': system.color }}>{system.name}</span></div>
      <h2>{system.question}</h2>
      <p className="plain"><T>{system.intro}</T></p>
      <h3>Three ideas to hold on to</h3>
      <ul className="ideas">{system.ideas.map(x => <li key={x}><T>{x}</T></li>)}</ul>
      <h3>Parts, in learning order</h3>
      <ol className="partcards">
        {system.parts.map((id, i) => (
          <li key={id}><Link to={`/system/${system.id}/${id}`}><b>{i + 1}</b><span><strong>{componentById[id].name}</strong>{componentById[id].plain}</span><ChevronRight size={16} /></Link></li>
        ))}
      </ol>
      {system.labs.length > 0 && <>
        <h3><FlaskConical size={16} /> Labs for this system</h3>
        <div className="lablinks">{system.labs.map(id => <Link key={id} to={`/labs/${id}`}><b>{labById[id].name}</b><span>{labById[id].blurb}</span><ArrowRight size={16} /></Link>)}</div>
      </>}
      <SourceLinks ids={system.sources} />
      <Link className="nexttab" to={`/system/${system.id}/${system.parts[0]}`}>Start with {componentById[system.parts[0]].label.toLowerCase()} <ArrowRight size={16} /></Link>
    </div>
  );
}

function Stepper({ prev, next, label }) {
  return (
    <div className="stepper">
      {prev ? <Link to={prev.to}><ArrowLeft size={16} /><span>{prev.label}</span></Link> : <span />}
      <small>{label}</small>
      {next ? <Link to={next.to} className="fwd"><span>{next.label}</span><ArrowRight size={16} /></Link> : <span />}
    </div>
  );
}

/* ---------- page ---------- */

export default function Explore() {
  const { sid, cid, jid, step } = useParams();
  const navigate = useNavigate();
  const [resetKey, setResetKey] = useState(0);

  const system = sid ? systemById[sid] : null;
  const journey = jid ? journeyById[jid] : null;
  const stepIndex = journey ? Math.min(Math.max(parseInt(step || '1', 10) - 1, 0), journey.steps.length - 1) : null;
  const partId = journey ? journey.steps[stepIndex].part : cid;
  const part = partId ? componentById[partId] : null;

  if ((sid && !system) || (jid && !journey) || (cid && !componentById[cid])) {
    return <div className="notfound"><h2>That page does not exist.</h2><Link to="/">Back to the whole car</Link></div>;
  }

  const partIds = system ? system.parts : journey ? [...new Set(journey.steps.map(s => s.part))] : null;
  // Pin numbers match the list in the rail: learning order for a system, step number for a journey.
  const numbers = system
    ? Object.fromEntries(system.parts.map((id, i) => [id, i + 1]))
    : journey
      ? journey.steps.reduce((m, st, i) => ({ ...m, [st.part]: i === stepIndex || m[st.part] == null ? i + 1 : m[st.part] }), {})
      : null;
  const trace = journey ? journey.steps.map(s => s.part).filter((id, i, a) => id !== a[i - 1]) : null;
  const select = id => {
    if (!id) return;
    if (journey) {
      const i = journey.steps.findIndex(s => s.part === id);
      if (i >= 0) navigate(`/journey/${journey.id}/${i + 1}`);
    } else if (system && system.parts.includes(id)) navigate(`/system/${system.id}/${id}`);
    else navigate(`/part/${id}`);
  };

  let stepper = null;
  if (journey) {
    const to = i => ({ to: `/journey/${journey.id}/${i + 1}`, label: journey.steps[i].title });
    stepper = <Stepper label={`Step ${stepIndex + 1} of ${journey.steps.length}`} prev={stepIndex > 0 ? to(stepIndex - 1) : null} next={stepIndex < journey.steps.length - 1 ? to(stepIndex + 1) : null} />;
  } else if (system && part) {
    const i = system.parts.indexOf(part.id);
    const to = k => ({ to: `/system/${system.id}/${system.parts[k]}`, label: componentById[system.parts[k]].label });
    stepper = <Stepper label={`${i + 1} of ${system.parts.length} in ${system.short}`} prev={i > 0 ? to(i - 1) : { to: `/system/${system.id}`, label: 'System overview' }} next={i < system.parts.length - 1 ? to(i + 1) : null} />;
  }

  const title = journey ? journey.name : system ? system.name : part ? part.name : 'Whole car';
  const subtitle = journey ? journey.blurb : system ? system.question : part ? 'Shown in the context of the whole car' : 'Pick a system on the left to isolate it';

  return (
    <div className="explore">
      <Rail system={system} journey={journey} partId={partId} stepIndex={stepIndex} />

      <section className="stage" aria-label="3D model of the car">
        <div className="stage-head" style={{ '--c': system?.color || '#8fb4d8' }}>
          <div><h1>{title}</h1><p>{subtitle}</p></div>
          <button onClick={() => setResetKey(k => k + 1)} title="Reset the camera"><RotateCcw size={15} /> Reset view</button>
        </div>
        <SceneBoundary>
          <Suspense fallback={<div className="scene-fallback">Loading the 3D model…</div>}>
            <CarScene systemId={system?.id || null} partIds={partIds} contextIds={system?.context || (journey ? ['accumulator'] : null)} selected={partId || null} numbers={numbers} trace={trace} onSelect={select} resetKey={resetKey} />
          </Suspense>
        </SceneBoundary>
        <p className="hint">Drag to rotate · scroll to zoom · click a part</p>
        {!system && !journey && <ul className="legend">{systems.map(s => <li key={s.id}><Link to={`/system/${s.id}`} style={{ '--c': s.color }}><i className="dot" />{s.short}</Link></li>)}</ul>}
      </section>

      <aside className="panel" key={(jid || '') + (sid || '') + (partId || '') + (stepIndex ?? '')}>
        {stepper}
        {journey && (
          <div className="stepcard">
            <small>{journey.name} · step {stepIndex + 1}</small>
            <h3>{journey.steps[stepIndex].title}</h3>
            <p><T>{journey.steps[stepIndex].text}</T></p>
            {stepIndex === journey.steps.length - 1 && <SourceLinks ids={journey.sources} />}
          </div>
        )}
        {part ? <PartDetail part={part} /> : system ? <SystemIntro system={system} /> : <Welcome />}
      </aside>
    </div>
  );
}
