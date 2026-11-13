import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { launchState, smooth } from "./timeline";

// Pad 39A-style launch complex. Scene units: the shuttle stack is ~5.1 tall.
export const DECK_Y = 0; // Mobile launcher platform deck (SRB skirts sit here)
const HARDSTAND_Y = -1.1; // Top of the raised concrete pad
export const GROUND_Y = -1.6; // Surrounding marsh / grass
const TOWER_X = -2.45;
const TOWER_W = 1.1;
const TOWER_TOP = 5.6;
const COAST_Z = -70;

// [x, z, width, height, depth] — service buildings around the pad perimeter
const PAD_BUILDINGS: [number, number, number, number, number][] = [
  [-9, 9, 2.4, 0.9, 1.6],
  [-6.5, 12, 1.4, 0.6, 1],
  [8, 12, 3, 0.8, 1.4],
  [12, 3, 1.2, 1.1, 1.2],
  [-14, -2, 2, 0.7, 1.4],
  [6, -13, 2.6, 1, 1.8],
  [-7, -14, 1.6, 0.6, 1.2],
  [16, 14, 1.8, 0.7, 1.1],
];
const LIGHT_MASTS: [number, number][] = [
  [-10, 6],
  [9.5, 6.5],
  [-10.5, -8],
  [10, -9],
  [3, 15],
  [-3.5, 15.5],
];

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

const speckle = (g: CanvasRenderingContext2D, s: number, n: number, cols: string[], max = 3) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0]!;
    g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * max, 1 + Math.random() * max);
  }
};

const grassTexture = () =>
  canvasTexture(
    512,
    (g, s) => {
      g.fillStyle = "#3d5226";
      g.fillRect(0, 0, s, s);
      // low scrub, palmetto clumps and sandy patches
      for (let i = 0; i < 160; i++) {
        const r = 10 + Math.random() * 60;
        const x = Math.random() * s, y = Math.random() * s;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        const tone = ["rgba(28,44,20,0.55)", "rgba(84,98,48,0.4)", "rgba(52,70,34,0.5)", "rgba(150,138,98,0.22)"][i % 4]!;
        grd.addColorStop(0, tone);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grd;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * s, y = Math.random() * s, r = 1 + Math.random() * 3.5;
        g.fillStyle = ["rgba(20,32,14,0.55)", "rgba(70,92,40,0.45)", "rgba(96,112,58,0.35)"][i % 3]!;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      speckle(g, s, 26000, ["rgba(22,34,16,0.35)", "rgba(120,128,76,0.22)", "rgba(80,100,50,0.3)"], 2);
    },
    90,
  );

const sandTexture = () =>
  canvasTexture(
    256,
    (g, s) => {
      g.fillStyle = "#cbb88f";
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 30; i++) {
        const r = 15 + Math.random() * 50;
        const x = Math.random() * s, y = Math.random() * s;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, ["rgba(225,212,180,0.35)", "rgba(160,140,100,0.25)"][i % 2]!);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = grd;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      speckle(g, s, 14000, ["rgba(120,104,76,0.25)", "rgba(240,232,210,0.3)", "rgba(150,130,96,0.2)"], 2);
    },
    6,
  );

const concreteTexture = () =>
  canvasTexture(
    256,
    (g, s) => {
      g.fillStyle = "#c4bdab";
      g.fillRect(0, 0, s, s);
      speckle(g, s, 14000, ["rgba(80,78,72,0.22)", "rgba(200,198,190,0.25)", "rgba(120,110,95,0.15)"], 2);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = `rgba(60,55,50,${0.05 + Math.random() * 0.08})`;
        g.beginPath();
        g.ellipse(Math.random() * s, Math.random() * s, 20 + Math.random() * 50, 10 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = "rgba(55,55,55,0.35)";
      for (let x = 0; x <= s; x += 64) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, s);
        g.moveTo(0, x);
        g.lineTo(s, x);
        g.stroke();
      }
    },
    4,
  );

const gravelTexture = () =>
  canvasTexture(
    256,
    (g, s) => {
      g.fillStyle = "#b8ae98";
      g.fillRect(0, 0, s, s);
      speckle(g, s, 16000, ["rgba(90,80,65,0.35)", "rgba(235,228,210,0.35)", "rgba(140,120,95,0.3)"], 2);
    },
    1,
  );

const panelTexture = (base: string, line: string) =>
  canvasTexture(
    256,
    (g, s) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      speckle(g, s, 3000, ["rgba(0,0,0,0.08)", "rgba(255,255,255,0.08)"], 2);
      g.strokeStyle = line;
      g.lineWidth = 2;
      for (let y = 0; y <= s; y += 32) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(s, y);
        g.stroke();
      }
      for (let x = 0; x <= s; x += 64) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, s);
        g.stroke();
      }
    },
    1,
  );

type Beam = { p: [number, number, number]; s: [number, number, number]; r?: [number, number, number] };

function mergeBeams(beams: Beam[]) {
  const geos = beams.map((b) => {
    const g = new THREE.BoxGeometry(...b.s);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...b.p),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(b.r ?? [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1),
    );
    g.applyMatrix4(m);
    return g;
  });
  return mergeGeometries(geos)!;
}

/** Fixed service structure: square grey steel lattice tower with platforms, hammerhead crane and lightning mast. */
function buildTower() {
  const steel: Beam[] = [];
  const decks: Beam[] = [];
  const h = TOWER_TOP - HARDSTAND_Y;
  const w = TOWER_W;
  const half = w / 2;
  const cx = TOWER_X;
  const y0 = HARDSTAND_Y;
  for (const dx of [-half, 0, half])
    for (const dz of [-half, 0, half]) {
      if (dx === 0 && dz === 0) continue;
      steel.push({ p: [cx + dx, y0 + h / 2, dz], s: [0.06, h, 0.06] });
    }
  const step = 0.42;
  for (let y = y0 + step; y < TOWER_TOP; y += step) {
    for (const dz of [-half, half]) steel.push({ p: [cx, y, dz], s: [w, 0.035, 0.035] });
    for (const dx of [-half, half]) steel.push({ p: [cx + dx, y, 0], s: [0.035, 0.035, w] });
    const diag = Math.hypot(half, step);
    const ang = Math.atan2(half, step);
    // X-bracing on each face (two bays per face)
    for (const dz of [-half, half])
      for (const k of [-1, 1]) {
        steel.push({ p: [cx + (k * half) / 2, y - step / 2, dz], s: [0.022, diag, 0.022], r: [0, 0, k * ang] });
        steel.push({ p: [cx + (k * half) / 2, y - step / 2, dz], s: [0.022, diag, 0.022], r: [0, 0, -k * ang] });
      }
    for (const dx of [-half, half])
      for (const k of [-1, 1]) {
        steel.push({ p: [cx + dx, y - step / 2, (k * half) / 2], s: [0.022, diag, 0.022], r: [k * ang, 0, 0] });
        steel.push({ p: [cx + dx, y - step / 2, (k * half) / 2], s: [0.022, diag, 0.022], r: [-k * ang, 0, 0] });
      }
    if (Math.round((y - y0) / step) % 3 === 0) decks.push({ p: [cx, y + 0.02, 0], s: [w + 0.12, 0.03, w + 0.12] });
  }
  // hammerhead crane + roof
  decks.push({ p: [cx, TOWER_TOP + 0.05, 0], s: [w + 0.2, 0.1, w + 0.2] });
  steel.push({ p: [cx + 0.3, TOWER_TOP + 0.35, 0], s: [2.2, 0.16, 0.16] });
  steel.push({ p: [cx - 0.1, TOWER_TOP + 0.2, 0], s: [0.3, 0.3, 0.3] });
  // equipment rooms on a few levels (gives the FSS its cluttered silhouette)
  for (const y of [y0 + 1.3, y0 + 2.6, y0 + 3.9, y0 + 5.2])
    decks.push({ p: [cx - 0.15, y + 0.22, half * 0.4], s: [w * 0.6, 0.4, w * 0.5] });
  for (const y of [y0 + 0.9, y0 + 2.2, y0 + 3.5, y0 + 4.8])
    decks.push({ p: [cx + half + 0.18, y, -half + 0.2], s: [0.36, 0.05, 0.5] });
  // elevator shaft & cable trays
  decks.push({ p: [cx - half - 0.12, y0 + h / 2, -0.25], s: [0.22, h, 0.3] });
  return { steel: mergeBeams(steel), decks: mergeBeams(decks) };
}

/** Mobile launcher platform: deck with exhaust holes, pedestals and tail service masts. */
function buildPlatform() {
  const body: Beam[] = [
    { p: [0, DECK_Y - 0.35, 0], s: [3.4, 0.7, 2.8] },
    { p: [-0.48, DECK_Y + 0.25, 0.98], s: [0.3, 0.5, 0.34] },
    { p: [0.48, DECK_Y + 0.25, 0.98], s: [0.3, 0.5, 0.34] },
  ];
  for (const x of [-1.4, 1.4])
    for (const z of [-1.1, 1.1]) body.push({ p: [x, (HARDSTAND_Y + DECK_Y - 0.7) / 2, z], s: [0.35, DECK_Y - 0.7 - HARDSTAND_Y, 0.35] });
  const holes: Beam[] = [
    { p: [-0.65, DECK_Y + 0.004, 0], s: [0.62, 0.01, 0.62] },
    { p: [0.65, DECK_Y + 0.004, 0], s: [0.62, 0.01, 0.62] },
    { p: [0, DECK_Y + 0.004, 0.62], s: [0.7, 0.01, 0.5] },
  ];
  return { body: mergeBeams(body), holes: mergeBeams(holes) };
}

/** Pad 39A-style launch complex with retracting access arms, crawlerway, water tower and coastline. */
export function LaunchPad() {
  const tex = useMemo(
    () => ({
      grass: grassTexture(),
      concrete: concreteTexture(),
      gravel: gravelTexture(),
      sand: sandTexture(),
      mlp: panelTexture("#7d7f82", "rgba(30,30,30,0.4)"),
      rss: panelTexture("#a8abae", "rgba(50,52,55,0.45)"),
    }),
    [],
  );
  const tower = useMemo(buildTower, []);
  const platform = useMemo(buildPlatform, []);
  const goxArm = useRef<THREE.Group>(null);
  const accessArm = useRef<THREE.Group>(null);

  const catenary = useMemo(() => {
    const top = new THREE.Vector3(TOWER_X, TOWER_TOP + 2.3, 0);
    const pts: THREE.Vector3[] = [];
    for (const end of [new THREE.Vector3(TOWER_X - 9, GROUND_Y, 7), new THREE.Vector3(TOWER_X + 9, GROUND_Y, -7)]) {
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const p = top.clone().lerp(end, t);
        p.y -= Math.sin(t * Math.PI) * 0.8;
        pts.push(p);
        if (i > 0 && i < 24) pts.push(p.clone());
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);

  useFrame(() => {
    const p = launchState.progress;
    if (accessArm.current) accessArm.current.rotation.y = -1.45 * smooth(0.01, 0.045, p);
    if (goxArm.current) goxArm.current.rotation.y = -1.35 * smooth(0.04, 0.075, p);
  });

  const steel = <meshStandardMaterial color="#9ea2a6" roughness={0.55} metalness={0.55} />;
  const grey = <meshStandardMaterial color="#7c8085" roughness={0.6} metalness={0.45} />;
  const white = <meshStandardMaterial color="#e4e2dc" roughness={0.7} />;

  return (
    <group>
      {/* Marsh, beach and ocean */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, (COAST_Z + 1400) / 2]} receiveShadow>
        <planeGeometry args={[2800, 1400 - COAST_Z]} />
        <meshStandardMaterial map={tex.grass} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.01, COAST_Z - 4]}>
        <planeGeometry args={[2800, 8]} />
        <meshStandardMaterial color="#d9cba8" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.05, COAST_Z - 1000]}>
        <planeGeometry args={[2800, 2000]} />
        <meshStandardMaterial color="#1d4f7c" roughness={0.22} metalness={0.15} />
      </mesh>

      {/* Crawlerway */}
      <group rotation={[0, 0.55, 0]}>
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, GROUND_Y + 0.02, 66]} receiveShadow>
            <planeGeometry args={[1.1, 120]} />
            <meshStandardMaterial map={tex.gravel} roughness={1} />
          </mesh>
        ))}
      </group>

      {/* Sandy pad apron (the bright clearing around 39A) */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 8]} position={[0, GROUND_Y + 0.015, 0]} receiveShadow>
        <circleGeometry args={[24, 8]} />
        <meshStandardMaterial map={tex.sand} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, GROUND_Y + 0.02, 22]} receiveShadow>
        <planeGeometry args={[30, 7]} />
        <meshStandardMaterial map={tex.sand} roughness={1} />
      </mesh>

      {/* Perimeter buildings, pipe runs and floodlight masts */}
      {PAD_BUILDINGS.map(([x, z, w, h, d], i) => (
        <mesh key={`b${i}`} position={[x, GROUND_Y + h / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          {i % 3 === 0 ? grey : white}
        </mesh>
      ))}
      {LIGHT_MASTS.map(([x, z], i) => (
        <group key={`m${i}`} position={[x, GROUND_Y, z]}>
          <mesh position={[0, 2.4, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.06, 4.8, 6]} />
            {grey}
          </mesh>
          <mesh position={[0, 4.85, 0]}>
            <boxGeometry args={[0.35, 0.18, 0.08]} />
            {grey}
          </mesh>
        </group>
      ))}
      {[-1, 1].map((k) => (
        <mesh key={`pipe${k}`} position={[k * 4.5, GROUND_Y + 0.12, 10]} rotation={[0, k * 0.3, 0]}>
          <boxGeometry args={[0.18, 0.18, 12]} />
          {grey}
        </mesh>
      ))}

      {/* Raised hardstand (octagonal) with flame trench */}
      <mesh position={[0, (HARDSTAND_Y + GROUND_Y) / 2, 0]} rotation={[0, Math.PI / 8, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[6.2, 7.4, HARDSTAND_Y - GROUND_Y, 8]} />
        <meshStandardMaterial map={tex.concrete} roughness={0.95} />
      </mesh>
      <mesh position={[0, HARDSTAND_Y + 0.005, 0]}>
        <boxGeometry args={[1.5, 0.01, 12.5]} />
        <meshStandardMaterial color="#1a1918" roughness={1} />
      </mesh>

      {/* Mobile launcher platform */}
      <mesh geometry={platform.body} castShadow receiveShadow>
        <meshStandardMaterial map={tex.mlp} roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh geometry={platform.holes}>
        <meshStandardMaterial color="#0d0c0c" roughness={1} />
      </mesh>

      {/* Fixed service structure */}
      <mesh geometry={tower.steel} castShadow>
        {steel}
      </mesh>
      <mesh geometry={tower.decks} castShadow receiveShadow>
        {grey}
      </mesh>
      {/* Lightning mast + catenary wires */}
      <mesh position={[TOWER_X, TOWER_TOP + 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.08, 2.0, 10]} />
        <meshStandardMaterial color="#e8e6e1" roughness={0.5} />
      </mesh>
      <mesh position={[TOWER_X, TOWER_TOP + 2.35, 0]}>
        <coneGeometry args={[0.045, 0.14, 10]} />
        <meshStandardMaterial color="#c9c7c2" />
      </mesh>
      <lineSegments geometry={catenary}>
        <lineBasicMaterial color="#5b5d60" transparent opacity={0.6} />
      </lineSegments>

      {/* Orbiter access arm with white room */}
      <group ref={accessArm} position={[TOWER_X + TOWER_W / 2, 2.95, 0.3]}>
        <mesh position={[0.78, 0, 0.12]} rotation={[0, -0.16, 0]} castShadow>
          <boxGeometry args={[1.56, 0.16, 0.16]} />
          {grey}
        </mesh>
        <mesh position={[1.55, 0, 0.24]} castShadow>
          <boxGeometry args={[0.24, 0.24, 0.26]} />
          <meshStandardMaterial color="#e9e8e4" roughness={0.6} />
        </mesh>
      </group>

      {/* GOX vent arm with "beanie cap" over the external tank nose */}
      <group ref={goxArm} position={[TOWER_X + TOWER_W / 2, 4.62, 0]}>
        <mesh position={[0.9, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.07, 0.07]} />
          {steel}
        </mesh>
        <mesh position={[0.9, 0.13, 0]} castShadow>
          <boxGeometry args={[1.8, 0.03, 0.03]} />
          {steel}
        </mesh>
        <mesh position={[1.9, 0.16, 0]} castShadow>
          <sphereGeometry args={[0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#d8d6d0" roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Rotating service structure, swung back */}
      <group position={[TOWER_X + 0.2, 0, -TOWER_W / 2]} rotation={[0, 0.75, 0]}>
        <mesh position={[1.4, 1.6, -0.7]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 5.0, 1.2]} />
          <meshStandardMaterial map={tex.rss} roughness={0.75} metalness={0.15} />
        </mesh>
        <mesh position={[2.75, -0.35, -0.7]}>
          <boxGeometry args={[0.2, 1.4, 0.2]} />
          {grey}
        </mesh>
      </group>

      {/* Water tower (sound suppression) */}
      <group position={[14, GROUND_Y, -12]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.57) * 0.6, 3.5, Math.sin(i * 1.57) * 0.6]} castShadow>
            <cylinderGeometry args={[0.05, 0.08, 7, 6]} />
            {grey}
          </mesh>
        ))}
        <mesh position={[0, 7.6, 0]} castShadow>
          <sphereGeometry args={[1.05, 24, 16]} />
          <meshStandardMaterial color="#e6e4df" roughness={0.5} />
        </mesh>
      </group>

      {/* Propellant storage spheres */}
      {(
        [
          [-12, -9, 1.3],
          [11, 8, 1.1],
        ] as const
      ).map(([x, z, r]) => (
        <group key={x} position={[x, GROUND_Y, z]}>
          <mesh position={[0, r + 0.4, 0]} castShadow>
            <sphereGeometry args={[r, 24, 16]} />
            <meshStandardMaterial color="#ecebe7" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[r * 0.8, r * 0.9, 0.5, 16]} />
            <meshStandardMaterial color="#9c9a95" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyFragment = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSun;
  uniform float uStars;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.05, 0.9, h), 0.6));
    float sun = max(dot(d, uSun), 0.0);
    col += vec3(1.0, 0.85, 0.65) * (pow(sun, 16.0) * 0.12 + pow(sun, 900.0) * 2.0);
    vec3 g = d * 900.0;
    vec3 cell = floor(g);
    float star = step(0.9985, hash(cell)) * smoothstep(0.45, 0.1, length(fract(g) - 0.5));
    col += vec3(star) * uStars * smoothstep(0.0, 0.3, h);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSun: { value: new THREE.Vector3(-0.8, 0.18, -0.55).normalize() },
      uStars: { value: 0 },
    },
  });
}
