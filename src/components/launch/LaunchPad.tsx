import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
// [x, z, radiusX, radiusZ] — standing water in the marsh around the pad
const MARSH_PONDS: [number, number, number, number][] = [
  [-34, 18, 7, 3],
  [30, 30, 9, 3.5],
  [-46, -20, 6, 2.5],
  [40, -26, 8, 3],
  [8, 48, 10, 2.5],
  [-26, 60, 7, 3],
];

/** Instanced scrub trees: squashed icosahedra scattered outside the pad clearing, avoiding the roads. */
function buildTrees(count: number) {
  // one lumpy canopy = four jittered low-poly lobes, so the scrub reads as dense irregular vegetation, not blobs
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lobes: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    // indexed so the lobes shade smoothly (soft canopy, not faceted rocks)
    const g = mergeVertices(new THREE.IcosahedronGeometry(0.55 + rand() * 0.3, 1).deleteAttribute("normal").deleteAttribute("uv"));
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) pos.setXYZ(v, pos.getX(v) * (0.85 + rand() * 0.3), pos.getY(v) * (0.7 + rand() * 0.3), pos.getZ(v) * (0.85 + rand() * 0.3));
    g.translate((rand() - 0.5) * 0.9, 0.35 + rand() * 0.35, (rand() - 0.5) * 0.9);
    lobes.push(g);
  }
  lobes.forEach((g) => g.computeVertexNormals());
  const geometry = mergeGeometries(lobes)!;
  const mats: THREE.Matrix4[] = [];
  const colors: THREE.Color[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const palette = ["#263a19", "#2f4520", "#1f3014", "#3a5026", "#2b3d22", "#45552c"].map((c) => new THREE.Color(c));
  // Florida scrub grows in dense hammocks: most trees huddle around cluster centres so canopies merge
  const centres: [number, number][] = [];
  for (let k = 0; k < Math.max(8, Math.round(count / 28)); k++) {
    const r = 29 + Math.pow(rand(), 1.3) * 100;
    const a = rand() * Math.PI * 2;
    centres.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  let guard = 0;
  while (mats.length < count && guard++ < count * 20) {
    let x: number, z: number;
    if (rand() < 0.85) {
      const [cx, cz] = centres[Math.floor(rand() * centres.length)]!;
      const rr = Math.sqrt(rand()) * (2.5 + rand() * 3.5);
      const aa = rand() * Math.PI * 2;
      x = cx + Math.cos(aa) * rr;
      z = cz + Math.sin(aa) * rr;
    } else {
      const r = 27 + Math.pow(rand(), 0.8) * 125;
      const a = rand() * Math.PI * 2;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    if (Math.hypot(x, z) < 27) continue; // pad clearing
    if (z < COAST_Z + 6) continue; // keep the beach clear
    if (Math.abs(x * Math.cos(0.55) - z * Math.sin(0.55)) < 3 && z > 0) continue; // crawlerway
    const sx = 0.6 + rand() * 0.8;
    const sy = 0.35 + rand() * 0.55;
    q.setFromEuler(new THREE.Euler(0, rand() * Math.PI * 2, 0));
    mats.push(m.compose(new THREE.Vector3(x, GROUND_Y - 0.05, z), q, new THREE.Vector3(sx, sy, sx * (0.7 + rand() * 0.6))).clone());
    const c = palette[Math.floor(rand() * palette.length)]!.clone().offsetHSL(0, 0, (rand() - 0.5) * 0.04);
    colors.push(c);
  }
  return {
    geometry,
    count: mats.length,
    attach: (mesh: THREE.InstancedMesh | null) => {
      if (!mesh) return;
      mats.forEach((mat, i) => {
        mesh.setMatrixAt(i, mat);
        mesh.setColorAt(i, colors[i]!);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
  };
}

/** Leafy breakup for the instanced canopies: world-space noise darkens gaps between leaf clumps and jitters the normal,
 *  so the scrub reads as foliage instead of smooth green blobs. */
function foliage(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vLeaf;")
    .replace(
      "#include <worldpos_vertex>",
      "#include <worldpos_vertex>\nvLeaf = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;",
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 vLeaf;
      float lh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float ln(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(lh(i), lh(i + vec3(1,0,0)), f.x), mix(lh(i + vec3(0,1,0)), lh(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(lh(i + vec3(0,0,1)), lh(i + vec3(1,0,1)), f.x), mix(lh(i + vec3(0,1,1)), lh(i + vec3(1,1,1)), f.x), f.y), f.z);
      }`,
    )
    .replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      float leafA = ln(vLeaf * 5.0);
      float leafB = ln(vLeaf * 13.0 + 7.0);
      float leaf = leafA * 0.6 + leafB * 0.4;
      diffuseColor.rgb *= 0.45 + 0.95 * smoothstep(0.2, 0.85, leaf);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.25, 1.15, 0.7), smoothstep(0.7, 0.95, leafB) * 0.6);`,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      vec3 lj = vec3(ln(vLeaf * 9.0), ln(vLeaf * 9.0 + 3.1), ln(vLeaf * 9.0 + 6.7)) - 0.5;
      normal = normalize(normal + lj * 1.1);`,
    );
}

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
  t.anisotropy = 16;
  return t;
}

const speckle = (g: CanvasRenderingContext2D, s: number, n: number, cols: string[], max = 3) => {
  for (let i = 0; i < n; i++) {
    g.fillStyle = cols[(Math.random() * cols.length) | 0]!;
    g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * max, 1 + Math.random() * max);
  }
};

/** Breaks texture tiling on big ground planes with low-frequency world-space tone/hue blotches. */
function macroVariation(shader: { vertexShader: string; fragmentShader: string }) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vMacro;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMacro = (modelMatrix * vec4(transformed, 1.0)).xz;");
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec2 vMacro;
      float mh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float mn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mh(i), mh(i + vec2(1, 0)), f.x), mix(mh(i + vec2(0, 1)), mh(i + vec2(1, 1)), f.x), f.y); }`,
    )
    .replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      float m1 = mn(vMacro * 0.035) * 0.6 + mn(vMacro * 0.11) * 0.4;
      float m2 = mn(vMacro * 0.02 + 17.0);
      diffuseColor.rgb *= 0.72 + 0.5 * m1;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.25, 1.05, 0.7), smoothstep(0.55, 0.85, m2) * 0.6);`,
    );
}

const grassTexture = () =>
  canvasTexture(
    512,
    (g, s) => {
      g.fillStyle = "#34481f";
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
      g.fillStyle = "#bdb9ad";
      g.fillRect(0, 0, s, s);
      speckle(g, s, 14000, ["rgba(80,78,72,0.22)", "rgba(200,198,190,0.25)", "rgba(120,110,95,0.15)"], 2);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = `rgba(60,55,50,${0.05 + Math.random() * 0.08})`;
        g.beginPath();
        g.ellipse(Math.random() * s, Math.random() * s, 20 + Math.random() * 50, 10 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = "rgba(55,55,55,0.16)";
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
      // weathering: rust/grime streaks running down from the seams
      for (let i = 0; i < 18; i++) {
        const x = Math.random() * s, w = 6 + Math.random() * 24;
        const grd = g.createLinearGradient(0, 0, 0, s);
        grd.addColorStop(0, "rgba(40,36,32,0.05)");
        grd.addColorStop(1, "rgba(40,36,32,0)");
        g.fillStyle = grd;
        g.fillRect(x, 0, w, s * (0.3 + Math.random() * 0.7));
      }
      g.strokeStyle = line;
      g.lineWidth = 1;
      for (let y = 0; y <= s; y += 64) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(s, y);
        g.stroke();
      }
      for (let x = 0; x <= s; x += 128) {
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
  // deck railings on the platform levels
  for (let y = y0 + step * 3; y < TOWER_TOP; y += step * 3) {
    const ry = y + 0.16;
    for (const dz of [-half - 0.06, half + 0.06]) steel.push({ p: [cx, ry, dz], s: [w + 0.12, 0.012, 0.012] });
    for (const dx of [-half - 0.06, half + 0.06]) steel.push({ p: [cx + dx, ry, 0], s: [0.012, 0.012, w + 0.12] });
  }
  // elevator shaft & cable trays
  decks.push({ p: [cx - half - 0.12, y0 + h / 2, -0.25], s: [0.22, h, 0.3] });
  // vertical propellant / water feed lines running up the pad-side face
  const pipes = [-0.32, -0.2, 0.28].map((dz, i) => {
    const len = h - 0.6 - i * 0.9;
    const g = new THREE.CylinderGeometry(0.028, 0.028, len, 8);
    g.translate(cx + half + 0.05, y0 + len / 2, dz);
    return g;
  });
  return { steel: mergeBeams(steel), decks: mergeBeams(decks), pipes: mergeGeometries(pipes)! };
}

/** Steel framing on the rotating service structure's outer face. */
function buildRssFrame() {
  const beams: Beam[] = [];
  for (let x = 0.2; x <= 2.61; x += 0.48) beams.push({ p: [x, 1.6, -0.08], s: [0.05, 5.0, 0.05] });
  for (let y = -0.85; y <= 4.1; y += 0.5) beams.push({ p: [1.4, y, -0.08], s: [2.6, 0.04, 0.05] });
  return mergeBeams(beams);
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
  // vertical stiffener ribs on all four faces
  for (let x = -1.6; x <= 1.61; x += 0.32)
    for (const z of [-1.41, 1.41]) body.push({ p: [x, DECK_Y - 0.35, z], s: [0.05, 0.68, 0.04] });
  for (let z = -1.2; z <= 1.21; z += 0.4)
    for (const x of [-1.71, 1.71]) body.push({ p: [x, DECK_Y - 0.35, z], s: [0.04, 0.68, 0.05] });
  // mid-height ledge
  body.push({ p: [0, DECK_Y - 0.4, 0], s: [3.5, 0.05, 2.9] });
  // equipment huts and cable boxes along the deck edges
  for (const [x, z, w, h, d] of [
    [-1.35, -1.05, 0.5, 0.22, 0.4],
    [1.3, -1.1, 0.6, 0.16, 0.35],
    [1.35, 1.0, 0.45, 0.28, 0.45],
    [-1.4, 1.05, 0.4, 0.18, 0.35],
    [0, -1.2, 0.8, 0.12, 0.25],
  ] as const)
    body.push({ p: [x, DECK_Y + h / 2, z], s: [w, h, d] });
  const rails: Beam[] = [];
  for (const z of [-1.38, 1.38]) rails.push({ p: [0, DECK_Y + 0.14, z], s: [3.4, 0.012, 0.012] });
  for (const x of [-1.68, 1.68]) rails.push({ p: [x, DECK_Y + 0.14, 0], s: [0.012, 0.012, 2.8] });
  for (let x = -1.6; x <= 1.61; x += 0.32)
    for (const z of [-1.38, 1.38]) rails.push({ p: [x, DECK_Y + 0.07, z], s: [0.01, 0.14, 0.01] });
  const holes: Beam[] = [
    { p: [-0.65, DECK_Y + 0.004, 0], s: [0.62, 0.01, 0.62] },
    { p: [0.65, DECK_Y + 0.004, 0], s: [0.62, 0.01, 0.62] },
    { p: [0, DECK_Y + 0.004, 0.62], s: [0.7, 0.01, 0.5] },
  ];
  return { body: mergeBeams(body), holes: mergeBeams(holes), rails: mergeBeams(rails) };
}

/** Pad 39A-style launch complex with retracting access arms, crawlerway, water tower and coastline. */
export function LaunchPad({ trees = 600 }: { trees?: number }) {
  const tex = useMemo(
    () => ({
      grass: grassTexture(),
      concrete: concreteTexture(),
      gravel: gravelTexture(),
      sand: sandTexture(),
      mlp: panelTexture("#7b7e82", "rgba(30,30,30,0.25)"),
      rss: panelTexture("#b4b6b8", "rgba(50,52,55,0.25)"),
    }),
    [],
  );
  const tower = useMemo(buildTower, []);
  const platform = useMemo(buildPlatform, []);
  const rssFrame = useMemo(buildRssFrame, []);
  const ocean = useMemo(createOceanMaterial, []);
  const forest = useMemo(() => buildTrees(trees), [trees]);
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

  useFrame((state) => {
    ocean.uniforms["uTime"]!.value = state.clock.elapsedTime;
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
        <meshStandardMaterial map={tex.grass} roughness={1} onBeforeCompile={macroVariation} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y + 0.01, COAST_Z - 4]}>
        <planeGeometry args={[2800, 8]} />
        <meshStandardMaterial color="#d9cba8" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.05, COAST_Z - 1000]} material={ocean}>
        <planeGeometry args={[2800, 2000]} />
      </mesh>
      {/* surf line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y - 0.03, COAST_Z - 8.6]}>
        <planeGeometry args={[2800, 1.2]} />
        <meshStandardMaterial color="#e9efef" roughness={0.9} transparent opacity={0.55} />
      </mesh>

      {/* Marsh ponds and drainage canals */}
      {MARSH_PONDS.map(([x, z, rx, rz], i) => (
        <mesh key={`pond${i}`} rotation={[-Math.PI / 2, 0, i * 0.7]} position={[x, GROUND_Y + 0.01, z]} scale={[rx, rz, 1]}>
          <circleGeometry args={[1, 20]} />
          <meshStandardMaterial color="#29453f" roughness={0.12} metalness={0.2} />
        </mesh>
      ))}

      {/* Scrub trees and palmetto clumps */}
      <instancedMesh args={[forest.geometry, undefined, forest.count]} ref={forest.attach} castShadow receiveShadow>
        <meshStandardMaterial vertexColors={false} roughness={0.95} onBeforeCompile={foliage} />
      </instancedMesh>

      {/* Perimeter road and pad access road */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 8]} position={[0, GROUND_Y + 0.025, 0]} receiveShadow>
        <ringGeometry args={[24.6, 25.6, 8]} />
        <meshStandardMaterial color="#4b4c4e" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.35]} position={[-18, GROUND_Y + 0.025, 46]} receiveShadow>
        <planeGeometry args={[0.9, 50]} />
        <meshStandardMaterial color="#4b4c4e" roughness={0.9} />
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
        <boxGeometry args={[12.5, 0.01, 1.5]} />
        <meshStandardMaterial color="#3a3733" roughness={1} map={tex.concrete} />
      </mesh>

      {/* Mobile launcher platform */}
      <mesh geometry={platform.body} castShadow receiveShadow>
        <meshStandardMaterial map={tex.mlp} roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh geometry={platform.rails}>
        {steel}
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
      <mesh geometry={tower.pipes} castShadow>
        {white}
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
        <mesh geometry={rssFrame} position={[0, 0, -0.7 + 0.6]} castShadow>
          {steel}
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
        <mesh position={[0, 3.5, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 7, 12]} />
          <meshStandardMaterial color="#e6e4df" roughness={0.6} />
        </mesh>
        <mesh position={[0, 7.6, 0]} castShadow>
          <sphereGeometry args={[1.05, 24, 16]} />
          <meshStandardMaterial color="#e6e4df" roughness={0.5} />
        </mesh>
      </group>

      {/* Propellant storage spheres */}
      {(
        [
          [-19, -15, 1.3],
          [15, 10, 1.1],
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
  uniform sampler2D uPhoto;
  uniform float uPhotoMix;
  uniform float uPhotoOffset;
  uniform float uPhotoDim;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.05, 0.9, h), 0.6));
    float sun = max(dot(d, uSun), 0.0);
    col += vec3(1.0, 0.88, 0.7) * (pow(sun, 64.0) * 0.06 + pow(sun, 6000.0) * 1.6);
    if (uPhotoMix > 0.0) {
      // real photographed cumulus sky (upper hemisphere equirect), a touch more saturated like broadcast footage
      vec2 puv = vec2(fract(atan(d.z, d.x) / 6.2831853 + 0.5 + uPhotoOffset), clamp(asin(clamp(d.y, 0.0, 1.0)) / 1.5707963, 0.002, 0.998));
      vec3 photo = texture2D(uPhoto, puv).rgb;
      float lum = dot(photo, vec3(0.2126, 0.7152, 0.0722));
      photo = max(mix(vec3(lum), photo, 1.35), 0.0) * vec3(0.92, 0.97, 1.08) * 1.25;
      photo *= mix(1.0, 0.72, smoothstep(0.1, 0.9, h));
      col = mix(col, photo * uPhotoDim, uPhotoMix);
    }
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
      uSun: { value: new THREE.Vector3(-0.55, 0.32, 0.78).normalize() },
      uStars: { value: 0 },
      uPhoto: { value: null as THREE.Texture | null },
      uPhotoMix: { value: 0 },
      // rotates the photo so its sun sits at the same azimuth as the scene's sun light
      uPhotoOffset: { value: -0.2516 },
      uPhotoDim: { value: 1 },
    },
  });
}

/** Loads the photographed sky into a sky material without suspending the scene (gradient shows until it arrives). */
export function loadSkyPhoto(mat: THREE.ShaderMaterial, url: string) {
  new THREE.TextureLoader().load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    // no mipmaps: the equirect seam would otherwise pick a tiny mip and draw a line
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    mat.uniforms["uPhoto"]!.value = tex;
    mat.uniforms["uPhotoMix"]!.value = 1;
  });
}

const oceanVertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  #include <fog_pars_vertex>
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;
const oceanFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSkyRefl;
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  #include <fog_pars_fragment>
  // sum of travelling waves -> analytic slope for the normal
  vec2 waveSlope(vec2 p, float t) {
    vec2 s = vec2(0.0);
    vec2 dirs[4];
    dirs[0] = normalize(vec2(0.3, 1.0));
    dirs[1] = normalize(vec2(-0.6, 1.0));
    dirs[2] = normalize(vec2(1.0, 0.4));
    dirs[3] = normalize(vec2(-0.2, -1.0));
    float freq[4];
    freq[0] = 0.35; freq[1] = 0.6; freq[2] = 1.4; freq[3] = 2.6;
    for (int i = 0; i < 4; i++) {
      float ph = dot(dirs[i], p) * freq[i] + t * (1.2 + float(i) * 0.6);
      s += dirs[i] * cos(ph) * freq[i] * (0.07 / (1.0 + float(i)));
    }
    return s;
  }
  void main() {
    float camDist = length(cameraPosition - vWorld);
    vec2 sl = waveSlope(vWorld.xz, uTime) * (1.0 - smoothstep(30.0, 260.0, camDist) * 0.8);
    vec3 n = normalize(vec3(-sl.x, 1.0, -sl.y));
    vec3 v = normalize(cameraPosition - vWorld);
    float fres = 0.04 + 0.96 * pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 5.0);
    float shore = smoothstep(0.0, 40.0, -(vWorld.z + 78.0));
    vec3 water = mix(uShallow, uDeep, shore);
    vec3 col = mix(water, uSkyRefl, fres * 0.85);
    vec3 h = normalize(uSunDir + v);
    float spec = pow(clamp(dot(n, h), 0.0, 1.0), 320.0);
    col += vec3(1.0, 0.95, 0.85) * min(spec * 4.0, 6.0);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Animated ocean with Fresnel sky reflection and sun glitter. */
export function createOceanMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: oceanVertex,
    fragmentShader: oceanFragment,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color("#0f3a63") },
        uShallow: { value: new THREE.Color("#2b6f86") },
        uSkyRefl: { value: new THREE.Color("#8fb0d0") },
        uSunDir: { value: new THREE.Vector3(-0.55, 0.32, 0.78).normalize() },
      },
    ]),
  });
}
