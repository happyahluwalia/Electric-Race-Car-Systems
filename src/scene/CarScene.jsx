import React, { Suspense, createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Html, Edges, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { componentById } from '../data/components.js';
import { systems } from '../data/systems.js';
import { positions, routes } from './layout.js';

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

/* ---------- the car model: built in Blender by model/build_car.py ---------- */

const MODEL = '/car.glb';
useGLTF.preload(MODEL);

// Groups the glTF nodes: clickable parts are children of an Empty named with the
// component id; everything under the Empty "body" is context and never clickable.
// Meshes are rendered with their full local transform because meshopt
// quantisation stores a dequantising scale on each node.
function useCar() {
  const { nodes } = useGLTF(MODEL);
  return useMemo(() => {
    const parts = {}, body = [];
    Object.values(nodes).forEach(n => {
      if (!n.isMesh || !n.parent) return;
      const parent = n.parent.name;
      if (parent === 'body') body.push(n);
      else if (positions[parent]) (parts[parent] = parts[parent] || []).push(n);
    });
    return { parts, body };
  }, [nodes]);
}

const hexOf = m => '#' + m.color.getHexString();

/* ---------- one clickable component ---------- */

function Part({ id, meshes, state, number, onSelect, onHover }) {
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
      <Focus.Provider value={focus}>
        {meshes.map(n => (
          <mesh key={n.name} geometry={n.geometry} position={n.position} quaternion={n.quaternion} scale={n.scale}>
            <Mat color={n.material.name === 'main' ? c.color : hexOf(n.material)} metal={n.material.metalness} rough={n.material.roughness}
              alpha={n.material.transparent ? n.material.opacity : 1} />
          </mesh>
        ))}
      </Focus.Provider>
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
function Body({ meshes, fade }) {
  return meshes.map(n => {
    const u = n.userData || {};
    const wheel = u.kind === 'wheel';
    const opacity = wheel ? (fade === 1 ? 0.92 : 0.1) : (u.opacity ?? 0.2) * fade;
    return (
      <mesh key={n.name} geometry={n.geometry} position={n.position} quaternion={n.quaternion} scale={n.scale} raycast={noHit}>
        <meshStandardMaterial color={hexOf(n.material)} transparent opacity={opacity} depthWrite={wheel && fade === 1}
          metalness={n.material.metalness} roughness={n.material.roughness} />
        {u.edges ? <Edges color="#48637f" threshold={25} /> : null}
      </mesh>
    );
  });
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
  const { parts, body } = useCar();
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
      <Body meshes={body} fade={partIds ? 0.45 : 1} />
      {Object.keys(positions).map(id => parts[id] && (
        <Part key={id} id={id} meshes={parts[id]} state={stateOf(id)} onSelect={onSelect} onHover={setHover}
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
      <Suspense fallback={null}><Scene {...props} /></Suspense>
    </Canvas>
  );
}

