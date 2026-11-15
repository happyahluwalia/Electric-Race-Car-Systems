// "Look inside" lab: three assemblies drawn from code with physically based materials,
// an explode slider, flow highlighting and per-part cards. Content lives in
// src/data/assemblies.js; this file is only geometry and interaction.
import React, { createContext, useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Instance, Instances, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowRight, Info } from 'lucide-react';
import { assemblies, assemblyById } from '../data/assemblies.js';
import { componentById } from '../data/components.js';
import { T, SourceLinks, Check } from '../ui.jsx';
import './labs.css';

/* ---------- materials ---------- */

const PAL = {
  alu: ['#b9c2cc', 0.85, 0.32], steel: ['#b4bcc5', 0.75, 0.3], dark: ['#3d464f', 0.45, 0.45], plastic: ['#22272d', 0.05, 0.6],
  copper: ['#c9773e', 0.95, 0.3], nickel: ['#d7dbe0', 0.9, 0.25], pcb: ['#1f6b47', 0.1, 0.45], pcbBlue: ['#1d3f6e', 0.1, 0.45],
  chip: ['#15181c', 0.2, 0.4], wrap: ['#2f5d8a', 0.15, 0.35], orange: ['#e8772e', 0.1, 0.5], amber: ['#d9b45a', 0.05, 0.7],
  magnet: ['#d9dee3', 0.8, 0.22], pad: ['#d7a6a0', 0.05, 0.8], coolant: ['#3c8fc7', 0.4, 0.4], film: ['#e3d7b4', 0.1, 0.55],
  black: ['#111418', 0.2, 0.5], ceramic: ['#ece6d6', 0.05, 0.5]
};
const Look = createContext({ fade: 1, glow: null });
function M({ k, opacity = 1 }) {
  const { fade, glow } = useContext(Look);
  const [color, metal, rough] = PAL[k];
  const o = opacity * fade;
  return <meshStandardMaterial color={color} metalness={metal} roughness={rough} transparent={o < 1} opacity={o} depthWrite={o > 0.5}
    emissive={glow || '#000000'} emissiveIntensity={glow ? 0.3 : 0} side={o < 1 ? THREE.DoubleSide : THREE.FrontSide} />;
}
const Box = ({ s, p, k, r, rad = 0.02, o }) => <RoundedBox args={s} radius={Math.min(rad, ...s.map(v => v / 2.01))} smoothness={3} position={p} rotation={r} castShadow receiveShadow><M k={k} opacity={o} /></RoundedBox>;
const Cyl = ({ r1, r2 = r1, h, p, k, rot, seg = 32, open = false, o }) => <mesh position={p} rotation={rot} castShadow receiveShadow><cylinderGeometry args={[r1, r2, h, seg, 1, open]} /><M k={k} opacity={o} /></mesh>;
const Z90 = [Math.PI / 2, 0, 0];

/* ---------- battery module (20s4p of 21700 cells, 1 unit = 100 mm) ---------- */

const GRID = Array.from({ length: 80 }, (_, i) => [(i % 10 - 4.5) * 0.235, (Math.floor(i / 10) - 3.5) * 0.235]);
const battery = {
  cells: () => (<>
    <Instances limit={80} castShadow receiveShadow><cylinderGeometry args={[0.108, 0.108, 0.7, 28]} /><M k="wrap" />
      {GRID.map(([x, z], i) => <Instance key={i} position={[x, 0, z]} />)}</Instances>
    <Instances limit={80}><cylinderGeometry args={[0.07, 0.07, 0.02, 20]} /><M k="nickel" />
      {GRID.map(([x, z], i) => <Instance key={i} position={[x, 0.355, z]} />)}</Instances>
  </>),
  holders: () => (<><Box s={[2.45, 0.07, 2.0]} p={[0, 0.27, 0]} k="plastic" o={0.92} /><Box s={[2.45, 0.07, 2.0]} p={[0, -0.27, 0]} k="plastic" o={0.92} /></>),
  fuselinks: () => (<Instances limit={80}><boxGeometry args={[0.03, 0.012, 0.09]} /><M k="copper" />
    {GRID.map(([x, z], i) => <Instance key={i} position={[x, 0.372, z + 0.05]} />)}</Instances>),
  busbars: () => (<Instances limit={10}><boxGeometry args={[0.17, 0.018, 1.92]} /><M k="nickel" />
    {Array.from({ length: 10 }, (_, i) => <Instance key={i} position={[(i - 4.5) * 0.235, 0.39, 0]} />)}</Instances>),
  sense: () => (<>{Array.from({ length: 6 }, (_, i) => {
    const x = (i * 2 - 4.5) * 0.235;
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.41, -0.96), new THREE.Vector3(x, 0.5, -1.1), new THREE.Vector3(-1.2, 0.55, -1.1), new THREE.Vector3(-1.35, 0.55, -0.4)]);
    return <mesh key={i} castShadow><tubeGeometry args={[curve, 24, 0.012, 6]} /><M k={i % 2 ? 'orange' : 'amber'} /></mesh>;
  })}<Box s={[0.1, 0.12, 0.3]} p={[-1.38, 0.55, -0.35]} k="black" /></>),
  thermistors: () => (<Instances limit={16}><sphereGeometry args={[0.035, 12, 10]} /><M k="black" />
    {GRID.filter((_, i) => i % 5 === 2).map(([x, z], i) => <Instance key={i} position={[x + 0.06, -0.37, z]} />)}</Instances>),
  monitor: () => (<>
    <Box s={[1.7, 0.035, 0.62]} p={[0, 0.56, 0]} k="pcb" rad={0.01} />
    {[-0.45, 0.45].map(x => <Box key={x} s={[0.22, 0.03, 0.22]} p={[x, 0.59, 0]} k="chip" rad={0.005} />)}
    {[-0.75, 0.75].map(x => <Cyl key={x} r1={0.05} h={0.06} p={[x, 0.6, 0.18]} k="ceramic" seg={20} />)}
    {Array.from({ length: 10 }, (_, i) => <Box key={i} s={[0.06, 0.02, 0.03]} p={[(i - 4.5) * 0.12, 0.585, -0.22]} k="black" rad={0.004} />)}
  </>),
  barrier: () => <Box s={[2.5, 0.02, 2.05]} p={[0, 0.66, 0]} k="amber" o={0.55} rad={0.008} />,
  coldplate: () => (<><Box s={[2.55, 0.1, 2.1]} p={[0, -0.46, 0]} k="alu" /><Box s={[2.4, 0.02, 1.95]} p={[0, -0.4, 0]} k="pad" rad={0.005} /></>),
  terminals: () => (<>{[-0.5, 0.5].map(z => <group key={z}><Box s={[0.28, 0.05, 0.16]} p={[1.33, 0.39, z]} k="copper" rad={0.01} /><Cyl r1={0.035} h={0.12} p={[1.4, 0.44, z]} k="steel" seg={16} /></group>)}</>),
  mplug: () => (<><Box s={[0.18, 0.26, 0.4]} p={[-1.38, 0.15, 0.35]} k="dark" /><Box s={[0.1, 0.08, 0.3]} p={[-1.5, 0.15, 0.35]} k="orange" /></>)
};

/* ---------- inverter ---------- */

const inverter = {
  housing: () => (<group><Box s={[2.7, 0.06, 1.7]} p={[0, 0.95, 0]} k="alu" o={0.95} /><Box s={[2.7, 0.9, 0.06]} p={[0, 0.5, 0.82]} k="alu" o={0.5} /><Box s={[2.7, 0.9, 0.06]} p={[0, 0.5, -0.82]} k="alu" o={0.5} />
    <mesh position={[0.2, 0.985, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.16, 3]} /><meshStandardMaterial color="#f2c400" /></mesh></group>),
  coldplate: () => (<><Box s={[2.6, 0.14, 1.6]} p={[0, -0.02, 0]} k="alu" />{[-0.4, 0.4].map(z => <Cyl key={z} r1={0.06} h={0.3} p={[-1.4, -0.02, z]} rot={[0, 0, Math.PI / 2]} k="coolant" seg={18} />)}</>),
  modules: () => (<>{[-0.05, 0.45, 0.95].map(x => <group key={x}><Box s={[0.42, 0.14, 0.95]} p={[x, 0.12, 0]} k="black" /><Box s={[0.36, 0.02, 0.85]} p={[x, 0.2, 0]} k="ceramic" rad={0.005} />
    {[-0.3, 0, 0.3].map(z => <Cyl key={z} r1={0.035} h={0.08} p={[x, 0.24, z]} k="copper" seg={14} />)}</group>)}</>),
  laminated: () => (<><Box s={[1.5, 0.025, 0.7]} p={[0.2, 0.32, 0]} k="copper" rad={0.005} /><Box s={[1.5, 0.012, 0.72]} p={[0.2, 0.345, 0]} k="orange" rad={0.003} /><Box s={[1.5, 0.025, 0.7]} p={[0.2, 0.37, 0]} k="copper" rad={0.005} /></>),
  cap: () => (<><Box s={[0.6, 0.55, 1.2]} p={[-0.85, 0.35, 0]} k="film" rad={0.05} />{[-0.3, 0.3].map(z => <Cyl key={z} r1={0.04} h={0.1} p={[-0.85, 0.66, z]} k="steel" seg={14} />)}</>),
  gatedrv: () => (<><Box s={[1.5, 0.03, 1.1]} p={[0.45, 0.55, 0]} k="pcb" rad={0.008} />{[-0.05, 0.45, 0.95].flatMap(x => [-0.25, 0.25].map(z => <Box key={x + ':' + z} s={[0.14, 0.03, 0.12]} p={[x, 0.58, z]} k="chip" rad={0.005} />))}</>),
  control: () => (<><Box s={[1.3, 0.03, 1.0]} p={[0.3, 0.75, 0]} k="pcbBlue" rad={0.008} /><Box s={[0.24, 0.03, 0.24]} p={[0.2, 0.78, 0]} k="chip" rad={0.005} /><Box s={[0.12, 0.03, 0.12]} p={[0.65, 0.78, 0.25]} k="chip" rad={0.005} /><Box s={[0.1, 0.1, 0.45]} p={[-0.3, 0.8, 0]} k="black" /></>),
  csense: () => (<>{[-0.35, 0, 0.35].map(z => <mesh key={z} position={[1.45, 0.2, z]} rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[0.07, 0.028, 12, 24]} /><M k="black" /></mesh>)}</>),
  phases: () => (<>{[-0.35, 0, 0.35].map(z => <group key={z}><Box s={[0.5, 0.04, 0.1]} p={[1.35, 0.2, z]} k="copper" rad={0.008} /><Cyl r1={0.03} h={0.12} p={[1.55, 0.25, z]} k="steel" seg={14} /></group>)}</>),
  dcin: () => (<><Box s={[0.22, 0.3, 0.5]} p={[-1.45, 0.4, 0]} k="orange" rad={0.04} /><Cyl r1={0.06} h={0.5} p={[-1.8, 0.4, 0.12]} rot={[0, 0, Math.PI / 2]} k="orange" seg={16} /><Cyl r1={0.06} h={0.5} p={[-1.8, 0.4, -0.12]} rot={[0, 0, Math.PI / 2]} k="orange" seg={16} /></>)
};

/* ---------- axial-flux motor (axis along z) ---------- */

const ring = (n, r, f) => Array.from({ length: n }, (_, i) => f(i, (i / n) * Math.PI * 2, r));
const motor = {
  housing: () => (<><Cyl r1={1.08} h={0.62} p={[0, 0, 0]} rot={Z90} k="dark" seg={48} open o={0.45} />
    {ring(24, 1.1, (i, a, r) => <Box key={i} s={[0.05, 0.6, 0.05]} p={[Math.cos(a) * r, Math.sin(a) * r, 0]} r={[Math.PI / 2, 0, 0]} k="dark" rad={0.01} />)}</>),
  stator: () => (<><Cyl r1={0.95} h={0.16} p={[0, 0, 0]} rot={Z90} k="dark" seg={48} />
    <Instances limit={18} castShadow><boxGeometry args={[0.16, 0.42, 0.2]} /><M k="copper" />
      {ring(18, 0.66, (i, a, r) => <Instance key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} rotation={[0, 0, a + Math.PI / 2]} />)}</Instances></>),
  rotorA: () => (<group position={[0, 0, 0.19]}><Cyl r1={0.95} h={0.05} p={[0, 0, 0.04]} rot={Z90} k="steel" seg={48} />
    <Instances limit={20}><boxGeometry args={[0.2, 0.32, 0.03]} /><M k="magnet" />
      {ring(20, 0.66, (i, a, r) => <Instance key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} rotation={[0, 0, a + Math.PI / 2]} />)}</Instances></group>),
  rotorB: () => (<group position={[0, 0, -0.19]}><Cyl r1={0.95} h={0.05} p={[0, 0, -0.04]} rot={Z90} k="steel" seg={48} />
    <Instances limit={20}><boxGeometry args={[0.2, 0.32, 0.03]} /><M k="magnet" />
      {ring(20, 0.66, (i, a, r) => <Instance key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} rotation={[0, 0, a + Math.PI / 2]} />)}</Instances></group>),
  shaft: () => (<><Cyl r1={0.11} h={1.3} p={[0, 0, 0.25]} rot={Z90} k="steel" seg={24} />
    {[0.33, -0.33].map(z => <mesh key={z} position={[0, 0, z]} castShadow><torusGeometry args={[0.16, 0.05, 12, 28]} /><M k="steel" /></mesh>)}</>),
  resolver: () => (<><mesh position={[0, 0, -0.48]} castShadow><torusGeometry args={[0.22, 0.06, 12, 32]} /><M k="copper" /></mesh><Cyl r1={0.27} h={0.05} p={[0, 0, -0.52]} rot={Z90} k="black" seg={32} /></>),
  terminals: () => (<>{[-0.18, 0, 0.18].map(x => <group key={x}><Cyl r1={0.05} h={0.22} p={[x, 1.12, 0]} k="copper" seg={14} /><Cyl r1={0.07} h={0.05} p={[x, 1.08, 0]} k="black" seg={14} /></group>)}</>),
  coolant: () => (<>{[-0.15, 0.15].map(z => <Cyl key={z} r1={0.06} h={0.35} p={[-1.15, -0.55, z]} rot={[0, 0, Math.PI / 4]} k="coolant" seg={16} />)}</>)
};

const GEOM = { battery, inverter, motor };
const VIEW = { battery: { cam: [4.4, 3.6, 4.8], target: [0, 0.7, 0] }, inverter: { cam: [4.2, 3.4, 4.6], target: [0, 0.8, 0] }, motor: { cam: [4.6, 1.9, 2.3], target: [0, 0.1, 0], floor: -1.25 } };

/* ---------- scene ---------- */

// Narrow canvases (phones) need the camera further back to fit the exploded assembly.
function FitCamera({ view }) {
  const { camera, size } = useThree();
  React.useEffect(() => {
    const k = Math.max(1, 1.25 / (size.width / size.height));
    const t = new THREE.Vector3(...view.target);
    camera.position.copy(new THREE.Vector3(...view.cam).sub(t).multiplyScalar(k).add(t));
    camera.updateProjectionMatrix();
  }, [size.width, size.height]);
  return null;
}

function Piece({ part, geom, explode, state, color, onSelect, onHover, hovered }) {
  const look = useMemo(() => ({ fade: state === 'dim' ? 0.12 : 1, glow: state === 'on' ? color : null }), [state, color]);
  const off = part.explode.map(v => v * explode);
  return (
    <group position={off}
      onClick={e => { e.stopPropagation(); onSelect(part.id); }}
      onPointerOver={e => { e.stopPropagation(); onHover(part.id); }}
      onPointerOut={() => onHover(null)}>
      <Look.Provider value={look}>{geom()}</Look.Provider>
      {hovered && <Html center position={[0, 1.0, 0]} style={{ pointerEvents: 'none' }}><div className="pin hover"><span>{part.name}</span></div></Html>}
    </group>
  );
}

function Scene({ a, explode, selected, flow, onSelect }) {
  const [hover, setHover] = useState(null);
  const flowSet = flow ? new Set(flow.parts) : null;
  const state = id => (flowSet ? (flowSet.has(id) ? 'on' : 'dim') : selected === id ? 'on' : selected ? 'normal' : 'normal');
  const color = id => (flowSet ? flow.color : '#79bce9');
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 7, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 2]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 2, -2]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={1.4} position={[4, 3, -4]} scale={2} color="#9cc7ff" />
      </Environment>
      {a.parts.map(p => GEOM[a.id][p.id] && (
        <Piece key={p.id} part={p} geom={GEOM[a.id][p.id]} explode={explode} state={state(p.id)} color={color(p.id)}
          onSelect={onSelect} onHover={setHover} hovered={hover === p.id} />
      ))}
      <ContactShadows position={[0, VIEW[a.id].floor ?? -0.9, 0]} opacity={0.45} scale={8} blur={2.6} far={3} />
      <FitCamera view={VIEW[a.id]} />
      <OrbitControls makeDefault enableDamping target={VIEW[a.id].target} minDistance={1.5} maxDistance={12} />
    </>
  );
}

/* ---------- page ---------- */

export function AssemblyLab() {
  const [aid, setAid] = useState('battery');
  const a = assemblyById[aid];
  const [explode, setExplode] = useState(0.6);
  const [sel, setSel] = useState(a.parts[0].id);
  const [fid, setFid] = useState(null);
  const flow = a.flows.find(f => f.id === fid) || null;
  const part = a.parts.find(p => p.id === sel) || a.parts[0];
  const choose = id => { setAid(id); setSel(assemblyById[id].parts[0].id); setFid(null); setExplode(0.6); };
  const linked = componentById[part.link];

  return (
    <div className="learn-page">
      <header className="learn-heading"><div>
        <div className="learn-eyebrow">HIGH VOLTAGE · INSIDE THE HARDWARE</div>
        <h1>Look inside the major assemblies</h1>
        <p>Pull each assembly apart, click any part, and switch on a flow to see what travels through it. Every card says what the part does, why it is built that way, how it fails, and which 2027 rule it answers to.</p>
      </div></header>

      <div className="assembly-toolbar">
        <div role="tablist" aria-label="Assembly">{assemblies.map(x => <button key={x.id} role="tab" aria-selected={aid === x.id} className={aid === x.id ? 'active' : ''} onClick={() => choose(x.id)}>{x.short}</button>)}</div>
        <label className="explode">Pull apart <input type="range" min={0} max={1} step={0.01} value={explode} onChange={e => setExplode(+e.target.value)} aria-label="Explode amount" /></label>
      </div>

      <div className="assembly-layout">
        <div className="assembly-canvas tall">
          <Canvas shadows dpr={[1, 2]} camera={{ position: VIEW[aid].cam, fov: 38 }} key={aid} onPointerMissed={() => setFid(null)}>
            <Scene a={a} explode={explode} selected={sel} flow={flow} onSelect={id => { setSel(id); setFid(null); }} />
          </Canvas>
          <div className="flowbar" role="group" aria-label="Show a flow">
            {a.flows.map(f => <button key={f.id} className={fid === f.id ? 'active' : ''} style={{ '--c': f.color }} onClick={() => setFid(fid === f.id ? null : f.id)}><i />{f.name}</button>)}
          </div>
          <small>DRAG TO ORBIT · SCROLL TO ZOOM · CLICK A PART</small>
        </div>

        <section className="learn-card partcard" aria-live="polite">
          {flow ? <>
            <div className="learn-eyebrow" style={{ color: flow.color }}>FLOW · {flow.name.toUpperCase()}</div>
            <p className="flowtext"><T>{flow.text}</T></p>
            <ol className="flowlist">{flow.parts.map(id => { const p = a.parts.find(x => x.id === id); return <li key={id}><button onClick={() => { setSel(id); setFid(null); }}>{p.name}</button></li>; })}</ol>
          </> : <>
            <div className="learn-eyebrow">{a.name.toUpperCase()} · PART {a.parts.indexOf(part) + 1} OF {a.parts.length}</div>
            <h2>{part.name}</h2>
            <h3>What it does</h3><p><T>{part.what}</T></p>
            <h3>Why it is built this way</h3><p><T>{part.why}</T></p>
            <h3>How it fails</h3><p><T>{part.fails}</T></p>
            {part.rule && <p className="rulebox"><b>{part.rule.id}</b><T>{part.rule.text}</T></p>}
            {part.sources ? <SourceLinks ids={part.sources} /> : <p className="basis"><span>Based on</span>General engineering reasoning. No part-specific figures are claimed.</p>}
            {linked && <Link className="deeper" to={`/system/${linked.systems[0]}/${linked.id}`}>Go deeper: {linked.label} <ArrowRight size={14} /></Link>}
          </>}
          <div className="assembly-parts numbered">{a.parts.map((p, i) => <button key={p.id} className={sel === p.id && !flow ? 'active' : ''} onClick={() => { setSel(p.id); setFid(null); }}><b>{i + 1}</b>{p.name}</button>)}</div>
        </section>
      </div>

      <section className="learn-card wide intro">
        <h2>About this {a.short.toLowerCase()}</h2>
        <p><T>{a.intro}</T></p>
        <SourceLinks ids={a.sources} />
      </section>

      <section className="learn-card wide">
        <h2>Self-check: {a.short.toLowerCase()}</h2>
        <Check key={aid} items={a.quiz} />
      </section>
      <p className="learn-footnote"><Info /> Geometry is a teaching model built in code, close to real proportions but not manufacturing CAD. It gives no dimensions, ratings or safe assembly procedure.</p>
    </div>
  );
}
