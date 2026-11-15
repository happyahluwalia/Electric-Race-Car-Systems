import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html, Edges, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { componentById } from '../data/components.js';
import { systems } from '../data/systems.js';
import { positions, routes, REAR_AXLE, FRONT_AXLE } from './layout.js';

/* ---------- materials that react to "is this part in focus?" ---------- */

const Focus = createContext({ opacity: 1, glow: 0 });

function Mat({ color, metal = 0.25, rough = 0.55, alpha = 1 }) {
  const f = useContext(Focus);
  const opacity = f.opacity * alpha, glow = f.glow;
  return (
    <meshStandardMaterial
      color={color}
      metalness={metal}
      roughness={rough}
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={opacity >= 1}
      emissive={color}
      emissiveIntensity={glow}
    />
  );
}

const Box = ({ p = [0, 0, 0], s, c, r, ...m }) => (
  <mesh position={p} rotation={r}><boxGeometry args={s} /><Mat color={c} {...m} /></mesh>
);
const Cyl = ({ p = [0, 0, 0], rad, h, c, r, seg = 24, ...m }) => (
  <mesh position={p} rotation={r}><cylinderGeometry args={[rad, rad, h, seg]} /><Mat color={c} {...m} /></mesh>
);
const X = [0, 0, Math.PI / 2];
const Z = [Math.PI / 2, 0, 0];

/* ---------- the shape of each component (drawn around its own origin) ---------- */

const shapes = {
  cell: c => (<><Cyl rad={0.045} h={0.3} c={c} metal={0.6} /><Cyl p={[0, 0.16, 0]} rad={0.025} h={0.03} c="#d9dde2" metal={0.8} /></>),
  accumulator: c => (<>
    <Box s={[0.84, 0.64, 1.08]} c="#6b5a45" alpha={0.28} />
    {[-0.4, -0.2, 0, 0.2, 0.4].map(z => <Box key={z} p={[0, 0.02, z]} s={[0.74, 0.56, 0.17]} c={c} />)}
  </>),
  cellmonitor: c => [-0.32, -0.16, 0, 0.16, 0.32].map(x => <Box key={x} p={[x, 0, -0.22]} s={[0.12, 0.02, 0.36]} c={c} />),
  bms: c => (<><Box s={[0.3, 0.03, 0.26]} c={c} /><Box p={[0, 0.03, 0]} s={[0.1, 0.03, 0.1]} c="#1c2a33" /></>),
  hvfuse: c => (<><Cyl rad={0.045} h={0.2} c="#e9e3d2" r={Z} /><Cyl p={[0, 0, 0.11]} rad={0.05} h={0.03} c={c} r={Z} metal={0.8} /><Cyl p={[0, 0, -0.11]} rad={0.05} h={0.03} c={c} r={Z} metal={0.8} /></>),
  air: c => (<><Cyl rad={0.085} h={0.2} c={c} /><Cyl p={[0, 0.12, 0]} rad={0.03} h={0.05} c="#d9dde2" metal={0.8} /></>),
  contactorCoil: c => (<><Cyl rad={0.085} h={0.2} c="#c98a3b" /><Cyl p={[0, 0.12, 0]} rad={0.03} h={0.05} c="#d9dde2" metal={0.8} /><Box p={[0, -0.13, 0]} s={[0.12, 0.06, 0.12]} c={c} /></>),
  precharge: c => (<><Cyl rad={0.035} h={0.18} c={c} r={Z} /><Box p={[0, -0.07, 0]} s={[0.08, 0.06, 0.08]} c="#33414f" /></>),
  packcurrent: c => (<mesh rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.07, 0.028, 10, 24]} /><Mat color={c} /></mesh>),
  dcLink: c => [-0.22, 0, 0.22].map(z => <Cyl key={z} p={[0, 0, z]} rad={0.085} h={0.24} c={c} r={X} />),
  inverter: c => (<>
    <Box s={[0.5, 0.26, 0.74]} c={c} />
    {[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map(z => <Box key={z} p={[0, -0.16, z]} s={[0.46, 0.06, 0.03]} c="#5c4a8f" />)}
  </>),
  gateDriver: c => (<><Box s={[0.4, 0.02, 0.6]} c={c} />{[-0.2, 0, 0.2].map(z => <Box key={z} p={[0, 0.025, z]} s={[0.1, 0.03, 0.08]} c="#1c2a33" />)}</>),
  motor: c => (<>
    <Cyl rad={0.3} h={0.42} c={c} r={Z} seg={32} />
    <Cyl p={[0, 0, 0.27]} rad={0.05} h={0.14} c="#c9ced4" r={Z} metal={0.9} />
    <Cyl p={[0, 0, 0.33]} rad={0.1} h={0.03} c="#7b8691" r={Z} metal={0.8} />
  </>),
  resolver: c => (<><Cyl rad={0.14} h={0.07} c={c} r={Z} /><Cyl rad={0.05} h={0.09} c="#2a3642" r={Z} /></>),
  vcu: c => (<><Box s={[0.38, 0.12, 0.44]} c={c} /><Box p={[0.21, 0, 0]} s={[0.05, 0.08, 0.3]} c="#1c2a33" /></>),
  cancontroller: c => <Box s={[0.1, 0.035, 0.1]} c={c} />,
  cantransceiver: c => <Box s={[0.07, 0.035, 0.05]} c={c} />,
  apps: c => (<>
    <Box p={[0.02, -0.06, 0]} s={[0.03, 0.42, 0.13]} c="#8b98a6" r={[0, 0, -0.35]} metal={0.7} />
    <Cyl p={[0.1, -0.22, 0.1]} rad={0.05} h={0.05} c={c} r={Z} />
    <Cyl p={[0.1, -0.22, -0.1]} rad={0.05} h={0.05} c={c} r={Z} />
  </>),
  bspd: c => (<><Box s={[0.22, 0.025, 0.16]} c={c} /><Box p={[0, 0.03, 0]} s={[0.06, 0.03, 0.06]} c="#1c2a33" /></>),
  dashboard: c => (<>
    <Box s={[0.05, 0.22, 0.62]} c={c} />
    <mesh position={[0.2, -0.06, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.19, 0.025, 10, 28]} /><Mat color="#2a3642" /></mesh>
  </>),
  shutdown: c => (<>
    {[[0, 0, 0], [0, 0, -1.64], [-1.25, -0.42, -1.2]].map((p, i) => (
      <group key={i} position={p}>
        <Cyl rad={0.085} h={0.06} c={c} r={i === 2 ? X : Z} />
        <Cyl p={i === 2 ? [0.05, 0, 0] : [0, 0, i ? 0.05 : -0.05]} rad={0.05} h={0.06} c="#e7c53f" r={i === 2 ? X : Z} />
      </group>
    ))}
  </>),
  imd: c => (<><Box s={[0.06, 0.26, 0.34]} c="#e9d35a" /><Box p={[0.04, 0, 0]} s={[0.02, 0.1, 0.16]} c={c} /></>),
  tsal: c => (<><Cyl rad={0.07} h={0.1} c={c} /><Cyl p={[0, -0.07, 0]} rad={0.08} h={0.04} c="#2a3642" /></>),
  lv: c => (<><Box s={[0.42, 0.26, 0.22]} c={c} /><Box p={[0, 0.16, 0]} s={[0.3, 0.05, 0.14]} c="#22313d" /></>),
  dcdc: c => (<><Box s={[0.36, 0.18, 0.2]} c={c} />{[-0.12, -0.04, 0.04, 0.12].map(x => <Box key={x} p={[x, 0.12, 0]} s={[0.02, 0.06, 0.2]} c="#3c8997" />)}</>),
  can: c => (<><Box s={[0.16, 0.07, 0.1]} c={c} /><Box p={[0, 0.05, 0]} s={[0.1, 0.03, 0.06]} c="#1c2a33" /></>),
  cooling: c => (<>
    <Box s={[0.7, 0.5, 0.07]} c={c} r={[0, 0.25, 0]} />
    <Cyl p={[0.55, -0.32, 0]} rad={0.07} h={0.16} c="#2f7f86" r={X} />
  </>),
  sensors: c => (<><Cyl rad={0.035} h={0.12} c={c} metal={0.7} /><Box p={[0, 0.08, 0]} s={[0.06, 0.05, 0.06]} c="#22313d" /></>)
};

/* ---------- one clickable component ---------- */

function Part({ id, state, number, onSelect, onHover }) {
  const named = state === 'selected' || state === 'hover';
  const c = componentById[id];
  const focus = useMemo(() => ({
    opacity: state === 'dim' ? 0.05 : state === 'context' ? 0.2 : 1,
    glow: state === 'selected' ? 0.75 : state === 'hover' ? 0.35 : 0.04
  }), [state]);
  const interactive = state !== 'dim' && state !== 'context';
  const showLabel = state === 'selected' || state === 'hover' || number != null;
  return (
    <group
      position={positions[id]}
      scale={state === 'selected' ? 1.12 : 1}
      onClick={interactive ? e => { e.stopPropagation(); onSelect(id); } : undefined}
      onPointerOver={interactive ? e => { e.stopPropagation(); onHover(id); } : undefined}
      onPointerOut={interactive ? () => onHover(null) : undefined}
    >
      <Focus.Provider value={focus}>{shapes[id](c.color)}</Focus.Provider>
      {showLabel && (
        <Html position={[0, 0.22, 0]} center zIndexRange={[state === 'selected' ? 30 : 20, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`pin ${state}`}>{number != null && <b>{number}</b>}{named && <span>{c.label}</span>}</div>
        </Html>
      )}
    </group>
  );
}

/* ---------- the car body: context only, never clickable ---------- */

const noHit = () => null;
function Ghost({ p, s, r, o = 0.1, edges = false, children }) {
  const { fade } = useContext(BodyFade);
  return (
    <mesh position={p} rotation={r} raycast={noHit}>
      {children || <boxGeometry args={s} />}
      <meshStandardMaterial color="#9db7d1" transparent opacity={o * fade} depthWrite={false} roughness={0.9} />
      {edges && <Edges color="#48637f" threshold={25} />}
    </mesh>
  );
}
const BodyFade = createContext({ fade: 1 });
function Tube({ a, b, rad = 0.026 }) {
  const { fade } = useContext(BodyFade);
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    return {
      pos: va.clone().add(vb).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      len: dir.length()
    };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} raycast={noHit}>
      <cylinderGeometry args={[rad, rad, len, 8]} />
      <meshStandardMaterial color="#7d93aa" transparent opacity={0.5 * fade} depthWrite={false} metalness={0.4} roughness={0.5} />
    </mesh>
  );
}
function Wheel({ p }) {
  const { fade } = useContext(BodyFade);
  return (
    <group position={p} rotation={Z}>
      <mesh raycast={noHit}><cylinderGeometry args={[0.46, 0.46, 0.36, 32]} /><meshStandardMaterial color="#141b24" roughness={0.9} transparent opacity={fade === 1 ? 0.92 : 0.1} depthWrite={fade === 1} /></mesh>
      <mesh raycast={noHit}><cylinderGeometry args={[0.24, 0.24, 0.37, 20]} /><meshStandardMaterial color="#8793a0" metalness={0.7} roughness={0.4} transparent opacity={fade === 1 ? 0.92 : 0.1} depthWrite={fade === 1} /></mesh>
    </group>
  );
}
function Body({ fade }) {
  const R = REAR_AXLE, F = FRONT_AXLE;
  const hoop = (x, top, half) => [
    [[x, 0.14, -half], [x, top * 0.72, -half]], [[x, top * 0.72, -half], [x, top, -half * 0.55]],
    [[x, top, -half * 0.55], [x, top, half * 0.55]], [[x, top, half * 0.55], [x, top * 0.72, half]], [[x, top * 0.72, half], [x, 0.14, half]]
  ];
  const tubes = [
    ...hoop(0.45, 2.05, 0.82), ...hoop(-0.95, 1.22, 0.62),
    [[0.45, 1.45, -0.82], [R + 0.4, 0.5, -0.5]], [[0.45, 1.45, 0.82], [R + 0.4, 0.5, 0.5]],
    [[R + 0.4, 0.14, -0.5], [R + 0.4, 0.5, -0.5]], [[R + 0.4, 0.14, 0.5], [R + 0.4, 0.5, 0.5]], [[R + 0.4, 0.5, -0.5], [R + 0.4, 0.5, 0.5]]
  ];
  const value = useMemo(() => ({ fade }), [fade]);
  return (
    <BodyFade.Provider value={value}>
      {/* floor, front bay, cockpit tub, nose */}
      <Ghost p={[0.15, 0.12, 0]} s={[5.4, 0.04, 1.3]} o={0.2} />
      <Ghost p={[-1.72, 0.45, 0]} s={[1.55, 0.6, 0.72]} o={0.1} edges />
      <Ghost p={[-0.25, 0.47, 0]} s={[1.4, 0.64, 1.26]} o={0.08} edges />
      <Ghost p={[-3.0, 0.42, 0]} r={[0, 0, Math.PI / 2]} o={0.14} edges><cylinderGeometry args={[0.08, 0.42, 1.0, 4, 1]} /></Ghost>
      {/* sidepods */}
      <Ghost p={[0.1, 0.42, 1.02]} s={[1.5, 0.52, 0.4]} o={0.06} />
      <Ghost p={[0.1, 0.42, -1.02]} s={[1.5, 0.52, 0.4]} o={0.06} />
      {/* seat back and driver */}
      <Ghost p={[0.3, 0.9, 0]} s={[0.06, 0.9, 0.7]} r={[0, 0, 0.22]} o={0.1} />
      <Ghost p={[0.08, 1.52, 0]} o={0.16}><sphereGeometry args={[0.23, 20, 16]} /></Ghost>
      <Ghost p={[0.02, 1.0, 0]} s={[0.3, 0.6, 0.5]} r={[0, 0, 0.22]} o={0.07} />
      {/* wings */}
      <Ghost p={[-3.35, 0.2, 0]} s={[0.55, 0.03, 2.7]} o={0.26} />
      <Ghost p={[-3.35, 0.32, 1.35]} s={[0.6, 0.3, 0.02]} o={0.2} />
      <Ghost p={[-3.35, 0.32, -1.35]} s={[0.6, 0.3, 0.02]} o={0.2} />
      <Ghost p={[R + 0.75, 1.55, 0]} s={[0.55, 0.03, 2.0]} o={0.26} />
      <Ghost p={[R + 0.85, 1.35, 0]} s={[0.35, 0.03, 2.0]} o={0.2} />
      <Ghost p={[R + 0.75, 1.3, 1.0]} s={[0.7, 0.66, 0.02]} o={0.18} />
      <Ghost p={[R + 0.75, 1.3, -1.0]} s={[0.7, 0.66, 0.02]} o={0.18} />
      <Tube a={[R + 0.4, 0.5, -0.3]} b={[R + 0.75, 1.35, -0.3]} /><Tube a={[R + 0.4, 0.5, 0.3]} b={[R + 0.75, 1.35, 0.3]} />
      {tubes.map(([a, b], i) => <Tube key={i} a={a} b={b} />)}
      {[[F, 1.2], [F, -1.2], [R, 1.2], [R, -1.2]].map(([x, z]) => <Wheel key={x + ':' + z} p={[x, 0.46, z]} />)}
      {/* driveline: chain, differential, half shafts */}
      <Tube a={[2.35, 0.52, 0.23]} b={[R, 0.46, 0.23]} rad={0.02} />
      <Tube a={[R, 0.46, -1.02]} b={[R, 0.46, 1.02]} rad={0.035} />
      <Ghost p={[R, 0.46, 0.1]} r={Z} o={0.5}><cylinderGeometry args={[0.16, 0.16, 0.22, 20]} /></Ghost>
    </BodyFade.Provider>
  );
}

/* ---------- cable routes ---------- */

function Route({ points, color, active }) {
  const ref = useRef();
  useFrame((_, dt) => { if (active && ref.current) ref.current.material.dashOffset -= dt * 0.55; });
  return (
    <Line ref={ref} points={points} color={color} lineWidth={active ? 3.2 : 1.2} transparent opacity={active ? 1 : 0.38}
      dashed={active} dashSize={0.14} gapSize={0.07} raycast={noHit} />
  );
}

/* ---------- camera that eases to whatever is in focus ---------- */

const HOME = { cam: new THREE.Vector3(-7.2, 5.0, 9.4), target: new THREE.Vector3(-0.2, 0.7, 0) };

const SIDE = new THREE.Vector3(-0.32, 0.5, 0.8).normalize();

function Rig({ focusPoint, distance, overview, resetKey }) {
  const controls = useRef();
  const { camera, size } = useThree();
  const goal = useRef(null);
  const narrow = Math.max(1, 0.92 / (size.width / size.height));
  useEffect(() => {
    if (!controls.current) return;
    if (!focusPoint) {
      const dir = HOME.cam.clone().sub(HOME.target).multiplyScalar(narrow);
      goal.current = { cam: HOME.target.clone().add(dir), target: HOME.target.clone() };
      return;
    }
    const target = new THREE.Vector3(...focusPoint);
    const dir = overview ? SIDE.clone() : camera.position.clone().sub(controls.current.target).normalize();
    if (dir.y < 0.32) { dir.y = 0.32; dir.normalize(); }
    goal.current = { cam: target.clone().add(dir.multiplyScalar(distance * Math.min(narrow, 1.5))), target };
  }, [focusPoint && focusPoint.join(','), distance, overview, resetKey, narrow]);
  useFrame((_, dt) => {
    const g = goal.current;
    if (!g || !controls.current) return;
    const k = 1 - Math.exp(-dt * 5);
    camera.position.lerp(g.cam, k);
    controls.current.target.lerp(g.target, k);
    controls.current.update();
    if (camera.position.distanceTo(g.cam) < 0.01) goal.current = null;
  });
  return (
    <OrbitControls ref={controls} makeDefault enableDamping minDistance={1.4} maxDistance={26}
      maxPolarAngle={Math.PI / 2 - 0.03} onStart={() => { goal.current = null; }} />
  );
}

/* ---------- scene ---------- */

function Scene({ systemId, partIds, contextIds, selected, numbers, trace, onSelect, resetKey }) {
  const [hover, setHover] = useState(null);
  useEffect(() => { document.body.style.cursor = hover ? 'pointer' : ''; return () => { document.body.style.cursor = ''; }; }, [hover]);

  const activeSet = partIds ? new Set(partIds) : null;
  const stateOf = id => {
    if (activeSet && !activeSet.has(id) && id !== selected) return contextIds && contextIds.includes(id) ? 'context' : 'dim';
    if (id === selected) return 'selected';
    if (id === hover) return 'hover';
    return 'normal';
  };

  const { focusPoint, distance } = useMemo(() => {
    if (selected) return { focusPoint: positions[selected], distance: 3.3 };
    if (partIds && partIds.length) {
      const c = partIds.reduce((a, id) => a.map((v, i) => v + positions[id][i]), [0, 0, 0]).map(v => v / partIds.length);
      const radius = Math.max(...partIds.map(id => Math.hypot(...positions[id].map((v, i) => v - c[i]))));
      return { focusPoint: c, distance: Math.min(Math.max(radius * 3.4 + 1.6, 3.6), 12) };
    }
    return { focusPoint: null, distance: 0 };
  }, [selected, partIds && partIds.join(',')]);

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[-4, 9, 6]} intensity={2.1} />
      <directionalLight position={[6, 4, -6]} intensity={0.7} />
      <Body fade={partIds ? 0.45 : 1} />
      {Object.keys(positions).map(id => (
        <Part key={id} id={id} state={stateOf(id)} onSelect={onSelect} onHover={setHover}
          number={numbers ? numbers[id] ?? null : null} />
      ))}
      {trace && <Route points={trace.map(id => [positions[id][0], positions[id][1] + 0.12, positions[id][2]])} color="#f4f8fc" active />}
      {!trace && systems.map(s => (systemId ? s.id === systemId : true) && (routes[s.id] || []).map((pts, i) => (
        <Route key={s.id + i} points={pts} color={s.color} active={s.id === systemId} />
      )))}
      <gridHelper args={[18, 36, '#22384f', '#15273a']} position={[0, 0, 0]} />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.4} scale={14} blur={2.4} far={3} />
      <Rig focusPoint={focusPoint} distance={distance} overview={!selected} resetKey={resetKey} />
    </>
  );
}

export default function CarScene(props) {
  return (
    <Canvas camera={{ position: HOME.cam.toArray(), fov: 34 }} dpr={[1, 2]} onPointerMissed={() => props.onSelect(null)}>
      <Scene {...props} />
    </Canvas>
  );
}

