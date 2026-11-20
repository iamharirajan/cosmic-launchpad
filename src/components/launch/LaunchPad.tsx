import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { launchState, smooth } from "./timeline";

// Pad 39A-style launch complex. Scene units: the shuttle stack is ~5.1 tall.
export const DECK_Y = 0; // Mobile launcher platform deck (SRB skirts sit here)
const HARDSTAND_Y = -1.1; // Top of the raised concrete pad
export const GROUND_Y = -2.5; // Surrounding marsh / grass (the hardstand stands ~50 ft above it, like 39A)
/** Hardstand footprint half-sizes: flat top and the foot of its sloped ramps. */
const HS_TOP_X = 6.5;
const HS_BOTTOM_X = 11.5;
const HS_BOTTOM_Z = 10.1;
const TOWER_X = -2.45;
const TOWER_W = 1.1;
/** FSS level spacing (20 ft at this scale) and level count; the roof sits well above the tank nose like the real tower. */
const LEVEL = 0.55;
const TOWER_LEVELS = 15;
const TOWER_TOP = HARDSTAND_Y + LEVEL * TOWER_LEVELS;
/** Lightning mast: lattice base up to MAST_FOOT above the roof, fibreglass mast to MAST_TOP. */
const MAST_FOOT = 1.0;
const MAST_TOP = TOWER_TOP + 3.4;
const COAST_Z = -70;

// [x, z, width, height, depth] — service buildings around the pad perimeter
const PAD_BUILDINGS: [number, number, number, number, number][] = [
  [-14.5, -8, 2.4, 0.9, 1.6],
  [-7, 13.5, 1.4, 0.6, 1],
  [8, -16, 3, 0.8, 1.4],
  [14, 4, 1.2, 1.1, 1.2],
  [-16, 3, 2, 0.7, 1.4],
  [6, -13, 2.6, 1, 1.8],
  [-7, -14, 1.6, 0.6, 1.2],
  [18, -6, 1.8, 0.7, 1.1],
];
// weathered concrete / sun-bleached siding, never paper white
const BUILDING_TONES = ["#b3ad9f", "#8c8f8d", "#a19d92", "#c2bcae"];
/** Azimuth (atan2(z, x)) of the ground tracking camera seen from the pad; scrub is densest in its view. */
const CAMERA_AZIMUTH = Math.atan2(Math.cos(0.62), Math.sin(0.62));
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
function buildTrees(count: number, shrub = false) {
  // one lumpy canopy = four jittered low-poly lobes, so the scrub reads as dense irregular vegetation, not blobs
  let seed = shrub ? 11 : 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lobes: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    // indexed so the lobes shade smoothly (soft canopy, not faceted rocks)
    const g = mergeVertices(new THREE.IcosahedronGeometry(0.55 + rand() * 0.3, shrub ? 0 : 1).deleteAttribute("normal").deleteAttribute("uv"));
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
  // olive Florida scrub (oak, palmetto) with sun-bleached understory, as in the aerial pad photos
  const palette = (
    shrub
      ? ["#4a5230", "#5a5f37", "#3d4727", "#66653f", "#4f5a33", "#6b6844"]
      : ["#2d3b1d", "#3a4725", "#283318", "#46522c", "#334026", "#4f5a33"]
  ).map((c) => new THREE.Color(c));
  // Florida scrub grows in dense hammocks: most trees huddle around cluster centres so canopies merge
  const centres: [number, number][] = [];
  for (let k = 0; k < Math.max(8, Math.round(count / 28)); k++) {
    const r = 29 + Math.pow(rand(), 1.3) * 100;
    // half the hammocks sit between the camera and the pad, where they fill the foreground like real footage
    const a = k % 2 === 0 ? CAMERA_AZIMUTH + (rand() - 0.5) * 1.1 : rand() * Math.PI * 2;
    centres.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  let guard = 0;
  while (mats.length < count && guard++ < count * 20) {
    let x: number, z: number;
    if (!shrub && rand() < 0.85) {
      const [cx, cz] = centres[Math.floor(rand() * centres.length)]!;
      const rr = Math.sqrt(rand()) * (2.5 + rand() * 3.5);
      const aa = rand() * Math.PI * 2;
      x = cx + Math.cos(aa) * rr;
      z = cz + Math.sin(aa) * rr;
    } else {
      const r = 27 + Math.pow(rand(), 0.8) * 125;
      // understory is densest in the camera's view, where it fills the gaps between hammocks
      const a = shrub && rand() < 0.6 ? CAMERA_AZIMUTH + (rand() - 0.5) * 1.4 : rand() * Math.PI * 2;
      x = Math.cos(a) * r;
      z = Math.sin(a) * r;
    }
    if (Math.hypot(x, z) < 27) continue; // pad clearing
    if (z < COAST_Z + 6) continue; // keep the beach clear
    if (Math.abs(x * Math.cos(0.55) - z * Math.sin(0.55)) < 3 && z > 0) continue; // crawlerway
    const sx = shrub ? 0.9 + rand() * 1.2 : 0.6 + rand() * 0.8;
    const sy = shrub ? 0.12 + rand() * 0.18 : 0.35 + rand() * 0.55;
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
  [-13, 8.5],
  [12.8, 8.5],
  [-13, -10.5],
  [12.8, -11],
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

/**
 * Merge boxes into one geometry. With `weather > 0` every beam gets its own slightly different paint tone
 * (vertex colour, a few with a rust cast) so painted steel reads as weathered instead of CG-uniform.
 */
function mergeBeams(beams: Beam[], weather = 0) {
  let seed = 7919;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const geos = beams.map((b) => {
    const g = new THREE.BoxGeometry(...b.s);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...b.p),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(b.r ?? [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1),
    );
    g.applyMatrix4(m);
    if (weather > 0) {
      const k = 1 - rand() * weather;
      const rust = rand() < 0.2 ? rand() * weather : 0;
      const tone = [k + rust * 0.2, k - rust * 0.1, k - rust * 0.4];
      const n = g.attributes["position"]!.count;
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cols.set(tone, i * 3);
      g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    }
    return g;
  });
  return mergeGeometries(geos)!;
}

const UP = new THREE.Vector3(0, 1, 0);
/** A straight member of square section `t` from point a to point b. */
function strut(a: [number, number, number], b: [number, number, number], t: number): Beam {
  const va = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(va);
  const len = d.length();
  const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  const mid = va.addScaledVector(d, len / 2);
  return { p: [mid.x, mid.y, mid.z], s: [t, len, t], r: [e.x, e.y, e.z] };
}

type Face = "x" | "-x" | "z" | "-z";
/** Clad bays [level, face, width fraction, offset along face]: the real FSS is partly enclosed, not an open lattice. */
const CLAD_BAYS: [number, Face, number, number][] = [
  [1, "-x", 1, 0], [1, "-z", 1, 0], [2, "-x", 1, 0], [3, "z", 0.5, -0.25], [4, "-z", 1, 0],
  [5, "-x", 0.5, 0.25], [6, "z", 0.5, 0.25], [6, "-x", 1, 0], [8, "-z", 0.5, -0.25], [9, "z", 0.5, -0.25],
  [10, "-x", 1, 0], [12, "z", 1, 0], [12, "-z", 1, 0], [13, "x", 0.5, 0.25], [13, "z", 1, 0],
  [14, "-x", 1, 0], [14, "z", 1, 0], [14, "-z", 1, 0],
];

/**
 * Fixed service structure: tall square steel lattice of 20-ft levels with heavy corner columns, X-bracing,
 * grated floors and handrails, clad equipment rooms, an outside stair tower, elevator shaft, feed lines,
 * the emergency slidewire platform, a hammerhead crane on the roof and the lightning mast base.
 */
function buildTower() {
  const steel: Beam[] = [];
  const decks: Beam[] = [];
  const clad: Beam[] = [];
  const h = TOWER_TOP - HARDSTAND_Y;
  const w = TOWER_W;
  const half = w / 2;
  const cx = TOWER_X;
  const y0 = HARDSTAND_Y;

  // columns: heavy corners, lighter mid-face
  for (const dx of [-half, 0, half])
    for (const dz of [-half, 0, half]) {
      if (dx === 0 && dz === 0) continue;
      const corner = dx !== 0 && dz !== 0;
      steel.push({ p: [cx + dx, y0 + h / 2, dz], s: corner ? [0.085, h, 0.085] : [0.05, h, 0.05] });
    }

  const diag = Math.hypot(half, LEVEL);
  const ang = Math.atan2(half, LEVEL);
  for (let L = 1; L <= TOWER_LEVELS; L++) {
    const y = y0 + L * LEVEL;
    // ring girders + lighter mid-level girts
    for (const dz of [-half, half]) {
      steel.push({ p: [cx, y, dz], s: [w, 0.05, 0.045] });
      steel.push({ p: [cx, y - LEVEL / 2, dz], s: [w, 0.022, 0.022] });
    }
    for (const dx of [-half, half]) {
      steel.push({ p: [cx + dx, y, 0], s: [0.045, 0.05, w] });
      steel.push({ p: [cx + dx, y - LEVEL / 2, 0], s: [0.022, 0.022, w] });
    }
    // X-bracing on each face, two bays per face
    for (const dz of [-half, half])
      for (const k of [-1, 1]) {
        steel.push({ p: [cx + (k * half) / 2, y - LEVEL / 2, dz], s: [0.026, diag, 0.026], r: [0, 0, k * ang] });
        steel.push({ p: [cx + (k * half) / 2, y - LEVEL / 2, dz], s: [0.026, diag, 0.026], r: [0, 0, -k * ang] });
      }
    for (const dx of [-half, half])
      for (const k of [-1, 1]) {
        steel.push({ p: [cx + dx, y - LEVEL / 2, (k * half) / 2], s: [0.026, diag, 0.026], r: [k * ang, 0, 0] });
        steel.push({ p: [cx + dx, y - LEVEL / 2, (k * half) / 2], s: [0.026, diag, 0.026], r: [-k * ang, 0, 0] });
      }
    // grated floor every level, heavier floor every other level, overhanging the frame
    if (L < TOWER_LEVELS) decks.push({ p: [cx, y + 0.015, 0], s: [w + 0.14, L % 2 === 0 ? 0.04 : 0.018, w + 0.14] });
    // handrails (top + knee rail) and posts round the overhang
    const e = half + 0.07;
    for (const ry of [y + 0.17, y + 0.09]) {
      for (const dz of [-e, e]) steel.push({ p: [cx, ry, dz], s: [w + 0.14, 0.011, 0.011] });
      for (const dx of [-e, e]) steel.push({ p: [cx + dx, ry, 0], s: [0.011, 0.011, w + 0.14] });
    }
    for (let t = -e; t <= e + 0.001; t += (2 * e) / 5) {
      for (const dz of [-e, e]) steel.push({ p: [cx + t, y + 0.085, dz], s: [0.011, 0.17, 0.011] });
      for (const dx of [-e, e]) steel.push({ p: [cx + dx, y + 0.085, t], s: [0.011, 0.17, 0.011] });
    }
    // pipe-rack brackets on the pad face
    steel.push({ p: [cx + half + 0.06, y - 0.12, 0.05], s: [0.12, 0.025, 0.95] });
  }

  // clad bays and interior equipment rooms
  for (const [L, face, frac, off] of CLAD_BAYS) {
    const yc = y0 + (L - 0.5) * LEVEL;
    const span = w * frac;
    const hgt = LEVEL * 0.92;
    if (face === "z" || face === "-z") clad.push({ p: [cx + off * w, yc, (face === "z" ? 1 : -1) * (half - 0.03)], s: [span, hgt, 0.025] });
    else clad.push({ p: [cx + (face === "x" ? 1 : -1) * (half - 0.03), yc, off * w], s: [0.025, hgt, span] });
  }
  for (const L of [2, 5, 7, 11, 13]) decks.push({ p: [cx - 0.15, y0 + (L - 0.55) * LEVEL, -half * 0.35], s: [w * 0.55, LEVEL * 0.72, w * 0.45] });

  // outside stair tower on the +z face: switchback flights with landings
  const sz = half + 0.2;
  const run = w - 0.25;
  const rise = LEVEL / 2;
  const flight = Math.hypot(run, rise);
  for (const dx of [-half, half]) steel.push({ p: [cx + dx, y0 + h / 2, sz + 0.13], s: [0.04, h, 0.04] });
  for (let L = 1; L <= TOWER_LEVELS; L++)
    for (const dx of [-half, half]) steel.push({ p: [cx + dx, y0 + L * LEVEL, half + 0.15], s: [0.03, 0.03, 0.3] });
  for (let k = 0; k < TOWER_LEVELS * 2; k++) {
    const ya = y0 + k * rise;
    const dir = k % 2 === 0 ? 1 : -1;
    const a = Math.atan2(rise, run) * dir;
    decks.push({ p: [cx, ya + rise / 2, sz], s: [flight, 0.022, 0.2], r: [0, 0, a] });
    steel.push({ p: [cx, ya + rise / 2 + 0.15, sz + 0.11], s: [flight, 0.011, 0.011], r: [0, 0, a] });
    decks.push({ p: [cx + dir * (run / 2 + 0.07), ya + rise, sz], s: [0.16, 0.025, 0.22] });
  }

  // elevator shaft (runs up past the roof into the machine room) and cable trays
  clad.push({ p: [cx - half - 0.14, y0 + (h + 0.55) / 2, -0.25], s: [0.26, h + 0.55, 0.32] });
  for (let L = 1; L <= TOWER_LEVELS; L++) steel.push({ p: [cx - half - 0.14, y0 + L * LEVEL, -0.25], s: [0.3, 0.03, 0.36] });
  decks.push({ p: [cx + half + 0.04, y0 + (h - 1) / 2, -0.44], s: [0.05, h - 1, 0.12] });

  // emergency egress: slidewire platform on the 195-ft level, baskets parked under it
  const egressY = y0 + 10 * LEVEL;
  decks.push({ p: [cx - half - 0.42, egressY, 0.32], s: [0.56, 0.035, 0.7] });
  for (const dz of [0.04, 0.6]) steel.push({ p: [cx - half - 0.42, egressY + 0.15, dz], s: [0.56, 0.012, 0.012] });
  const slideStarts: THREE.Vector3[] = [];
  for (let i = 0; i < 7; i++) {
    const z = 0.04 + i * 0.093;
    slideStarts.push(new THREE.Vector3(cx - half - 0.62, egressY + 0.32, z));
    clad.push({ p: [cx - half - 0.68, egressY - 0.08, z], s: [0.12, 0.1, 0.075] });
  }
  steel.push({ p: [cx - half - 0.66, egressY + 0.16, 0.32], s: [0.03, 0.32, 0.7] });

  // roof, roof house and hammerhead crane
  const roofY = TOWER_TOP;
  decks.push({ p: [cx, roofY + 0.05, 0], s: [w + 0.2, 0.1, w + 0.2] });
  clad.push({ p: [cx - 0.22, roofY + 0.3, -0.18], s: [0.52, 0.42, 0.6] });
  const px = cx + 0.15;
  const pz = 0.22;
  const jy = roofY + 0.78;
  steel.push({ p: [px, roofY + 0.42, pz], s: [0.2, 0.72, 0.2] });
  // jib reaches away from the pad so the climbing stack never crosses it
  const j0 = px - 2.3;
  const j1 = px + 0.95;
  for (const dy of [0, 0.22])
    for (const dz of [-0.07, 0.07]) steel.push({ p: [(j0 + j1) / 2, jy + dy, pz + dz], s: [j1 - j0, 0.035, 0.035] });
  for (let x = j0; x < j1 - 0.01; x += 0.25)
    for (const dz of [-0.07, 0.07]) steel.push(strut([x, jy, pz + dz], [x + 0.25, jy + 0.22, pz + dz], 0.018));
  steel.push({ p: [px, jy + 0.5, pz], s: [0.06, 0.6, 0.06] });
  steel.push(strut([px, jy + 0.8, pz], [j1 - 0.1, jy + 0.22, pz], 0.012));
  steel.push(strut([px, jy + 0.8, pz], [j0 + 0.1, jy + 0.22, pz], 0.012));
  decks.push({ p: [j1 - 0.18, jy - 0.06, pz], s: [0.34, 0.3, 0.3] });
  clad.push({ p: [px - 0.22, jy - 0.16, pz + 0.17], s: [0.2, 0.18, 0.18] });
  steel.push({ p: [j0 + 0.2, jy - 0.55, pz], s: [0.008, 1.1, 0.008] });
  decks.push({ p: [j0 + 0.2, jy - 1.12, pz], s: [0.07, 0.09, 0.07] });

  // lightning mast base: four legs converging on the mast foot
  for (const sx of [-1, 1])
    for (const szz of [-1, 1]) steel.push(strut([cx + sx * 0.32, roofY + 0.1, szz * 0.32], [cx, roofY + MAST_FOOT, 0], 0.04));
  for (const [yy, r] of [[roofY + 0.4, 0.22], [roofY + 0.7, 0.12]] as const) {
    for (const dz of [-r, r]) steel.push({ p: [cx, yy, dz], s: [2 * r, 0.02, 0.02] });
    for (const dx of [-r, r]) steel.push({ p: [cx + dx, yy, 0], s: [0.02, 0.02, 2 * r] });
  }

  // vertical propellant / water feed lines running up the pad-side face
  const pipes = (
    [
      [cx + half + 0.05, -0.32, 0.028, h - 0.6],
      [cx + half + 0.05, -0.2, 0.028, h - 1.5],
      [cx + half + 0.05, 0.28, 0.028, h - 2.4],
      [cx + half + 0.1, 0.42, 0.048, h * 0.62],
      [cx - half - 0.05, half - 0.12, 0.034, h - 0.2],
    ] as const
  ).map(([x, z, r, len]) => {
    const g = new THREE.CylinderGeometry(r, r, len, 8);
    g.translate(x, y0 + len / 2, z);
    return g;
  });

  // red obstruction lights: roof corners, crane tip, mast top
  const lightPts: [number, number, number][] = [
    [cx - half - 0.08, roofY + 0.14, -half - 0.08],
    [cx + half + 0.08, roofY + 0.14, -half - 0.08],
    [cx - half - 0.08, roofY + 0.14, half + 0.08],
    [cx + half + 0.08, roofY + 0.14, half + 0.08],
    [j0, jy + 0.26, pz],
    [cx, MAST_TOP + 0.14, 0],
  ];
  const lights = mergeGeometries(
    lightPts.map((p) => new THREE.SphereGeometry(0.035, 8, 6).translate(...p)),
  )!;

  // slidewires down to the landing zone west of the pad
  const wirePts: THREE.Vector3[] = [];
  slideStarts.forEach((s, i) => {
    const end = new THREE.Vector3(cx - 26, GROUND_Y + 0.25, 4 + i * 0.6);
    for (let k = 0; k <= 16; k++) {
      const t = k / 16;
      const p = s.clone().lerp(end, t);
      p.y -= Math.sin(t * Math.PI) * 0.9;
      wirePts.push(p);
      if (k > 0 && k < 16) wirePts.push(p.clone());
    }
  });

  return {
    steel: mergeBeams(steel, 0.22),
    decks: mergeBeams(decks, 0.14),
    clad: mergeBeams(clad, 0.16),
    pipes: mergeGeometries(pipes)!,
    lights,
    slidewires: new THREE.BufferGeometry().setFromPoints(wirePts),
  };
}

/**
 * Rotating service structure (retracted): a big white clad payload-changeout block inside a steel lattice,
 * hinged on the FSS, with work platforms on the vehicle side and an A-frame truss leg + wheel truck at the far end.
 * Local frame: hinge at the origin, the structure runs along +x and back along -z.
 */
function buildRss() {
  const frame: Beam[] = [];
  const clad: Beam[] = [];
  const decks: Beam[] = [];
  const L = 4.2;
  const D = 1.3;
  const yb = 0.35;
  const yt = 4.6;
  const bay = L / 6;
  // payload changeout room + upper machinery house
  clad.push({ p: [2.35, (yb + yt) / 2 + 0.1, -D / 2], s: [2.0, yt - yb - 0.2, D - 0.1] });
  clad.push({ p: [1.35, yt + 0.25, -D / 2], s: [1.0, 0.5, 0.8] });
  clad.push({ p: [3.75, 1.3, -D - 0.12], s: [0.6, 0.9, 0.25] });
  clad.push({ p: [0.7, 2.6, -D - 0.1], s: [0.5, 0.7, 0.2] });
  // lattice on both long faces
  for (const z of [0, -D]) {
    for (let x = 0; x <= L + 0.001; x += bay) frame.push({ p: [x, (yb + yt) / 2, z], s: [0.055, yt - yb, 0.055] });
    for (let y = yb; y <= yt + 0.001; y += LEVEL) frame.push({ p: [L / 2, y, z], s: [L, 0.035, 0.035] });
    for (let x = 0; x < L - 0.001; x += bay)
      for (let y = yb; y < yt - 0.001; y += LEVEL * 2) {
        const y1 = Math.min(y + LEVEL * 2, yt);
        frame.push(strut([x, y, z], [x + bay, y1, z], 0.022));
        frame.push(strut([x + bay, y, z], [x, y1, z], 0.022));
      }
  }
  for (let x = 0; x <= L + 0.001; x += bay)
    for (const y of [yb, yt, (yb + yt) / 2]) frame.push({ p: [x, y, -D / 2], s: [0.035, 0.035, D] });
  decks.push({ p: [L / 2, yb - 0.06, -D / 2], s: [L + 0.1, 0.12, D + 0.1] });
  decks.push({ p: [L / 2, yt + 0.02, -D / 2], s: [L + 0.1, 0.05, D + 0.1] });
  // work platforms and stairs on the vehicle side
  for (const [y, x, w] of [
    [1.25, 1.0, 0.8],
    [2.0, 3.5, 0.7],
    [2.85, 0.9, 0.7],
    [3.7, 3.3, 0.9],
    [4.2, 2.0, 0.6],
  ] as const) {
    decks.push({ p: [x, y, 0.25], s: [w, 0.04, 0.5] });
    frame.push({ p: [x, y + 0.15, 0.5], s: [w, 0.011, 0.011] });
  }
  for (let k = 0; k < 6; k++) frame.push(strut([3.9, yb + k * 0.7, 0.15], [4.15, yb + (k + 0.5) * 0.7, 0.15], 0.06));
  // hinge column down to the hardstand
  for (const z of [0, -D]) frame.push({ p: [0, (HARDSTAND_Y + yb) / 2, z], s: [0.09, yb - HARDSTAND_Y, 0.09] });
  // far-end A-frame truss legs and the wheel truck that rides the circular rail
  const yf = HARDSTAND_Y + 0.3;
  for (const z of [0.1, -D - 0.1]) {
    frame.push(strut([L - 0.9, yb, z], [L - 0.25, yf, z], 0.07));
    frame.push(strut([L + 0.1, yb, z], [L - 0.25, yf, z], 0.07));
    frame.push({ p: [L - 0.4, (yb + yf) / 2, z], s: [0.7, 0.03, 0.03] });
  }
  frame.push(strut([L - 0.25, yf, 0.1], [L - 0.6, yb, -D - 0.1], 0.03));
  frame.push(strut([L - 0.25, yf, -D - 0.1], [L - 0.6, yb, 0.1], 0.03));
  decks.push({ p: [L - 0.25, HARDSTAND_Y + 0.15, -D / 2], s: [0.55, 0.3, D + 0.45] });
  return { frame: mergeBeams(frame, 0.18), clad: mergeBeams(clad, 0.1), decks: mergeBeams(decks, 0.12) };
}

/** Mobile launcher platform: deck with exhaust holes, pedestals, tail service masts and pipe runs along the sides. */
function buildPlatform() {
  const HX = 1.7;
  const HZ = 1.75;
  const body: Beam[] = [
    { p: [0, DECK_Y - 0.35, 0], s: [HX * 2, 0.7, HZ * 2] },
    { p: [-0.48, DECK_Y + 0.25, 0.98], s: [0.3, 0.5, 0.34] },
    { p: [0.48, DECK_Y + 0.25, 0.98], s: [0.3, 0.5, 0.34] },
  ];
  for (const x of [-1.35, 1.35])
    for (const z of [-1.35, 1.35]) body.push({ p: [x, (HARDSTAND_Y + DECK_Y - 0.7) / 2, z], s: [0.38, DECK_Y - 0.7 - HARDSTAND_Y, 0.38] });
  // vertical stiffener ribs on all four faces
  for (let x = -1.6; x <= 1.61; x += 0.32)
    for (const z of [-HZ - 0.01, HZ + 0.01]) body.push({ p: [x, DECK_Y - 0.35, z], s: [0.05, 0.68, 0.04] });
  for (let z = -1.6; z <= 1.61; z += 0.4)
    for (const x of [-HX - 0.01, HX + 0.01]) body.push({ p: [x, DECK_Y - 0.35, z], s: [0.04, 0.68, 0.05] });
  body.push({ p: [0, DECK_Y - 0.4, 0], s: [HX * 2 + 0.1, 0.05, HZ * 2 + 0.1] });
  // equipment huts and cable boxes along the deck edges
  for (const [x, z, w, h, d] of [
    [-1.3, -1.4, 0.5, 0.22, 0.4],
    [1.25, -1.45, 0.6, 0.16, 0.35],
    [1.3, 1.4, 0.45, 0.28, 0.45],
    [-1.35, 1.45, 0.4, 0.18, 0.35],
    [0, -1.5, 0.8, 0.12, 0.25],
    [1.45, 0.2, 0.25, 0.35, 0.3],
  ] as const)
    body.push({ p: [x, DECK_Y + h / 2, z], s: [w, h, d] });
  // stair towers at two corners, down to the hardstand
  for (const [x, z] of [[1.95, 1.2], [-1.95, -1.2]] as const) {
    body.push({ p: [x, (HARDSTAND_Y + DECK_Y) / 2, z], s: [0.3, DECK_Y - HARDSTAND_Y, 0.3] });
  }
  const rails: Beam[] = [];
  for (const z of [-HZ + 0.02, HZ - 0.02]) rails.push({ p: [0, DECK_Y + 0.14, z], s: [HX * 2, 0.012, 0.012] });
  for (const x of [-HX + 0.02, HX - 0.02]) rails.push({ p: [x, DECK_Y + 0.14, 0], s: [0.012, 0.012, HZ * 2] });
  for (let x = -1.6; x <= 1.61; x += 0.32)
    for (const z of [-HZ + 0.02, HZ - 0.02]) rails.push({ p: [x, DECK_Y + 0.07, z], s: [0.01, 0.14, 0.01] });
  const holes: Beam[] = [
    { p: [-0.65, DECK_Y + 0.004, 0], s: [0.62, 0.01, 0.62] },
    { p: [0.65, DECK_Y + 0.004, 0], s: [0.62, 0.01, 0.62] },
    { p: [0, DECK_Y + 0.004, 0.62], s: [0.7, 0.01, 0.5] },
  ];
  // white propellant / water pipe runs along the long faces (the photos show them running the full length)
  const pipes: THREE.BufferGeometry[] = [];
  for (const z of [-HZ - 0.06, HZ + 0.06])
    for (const [y, r] of [[DECK_Y - 0.16, 0.035], [DECK_Y - 0.27, 0.025], [DECK_Y - 0.58, 0.04]] as const)
      pipes.push(new THREE.CylinderGeometry(r, r, HX * 2 + 0.2, 8).rotateZ(Math.PI / 2).translate(0, y, z));
  return { body: mergeBeams(body), holes: mergeBeams(holes), rails: mergeBeams(rails), pipes: mergeGeometries(pipes)! };
}

/** A white pipe from a to b (used for the runs climbing the hardstand ramps). */
function pipeBetween(a: [number, number, number], b: [number, number, number], r: number) {
  const va = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(va);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()));
  g.translate(va.x + d.x / 2, va.y + d.y / 2, va.z + d.z / 2);
  return g;
}

/**
 * Raised Pad 39A hardstand: flat concrete top with long sloped ramps, and the flame-trench exits at both
 * x ends — a walled opening with support columns and white tanks inside, like the photos.
 */
function buildHardstand() {
  const H = HARDSTAND_Y - GROUND_Y;
  const zs = HS_BOTTOM_Z / HS_BOTTOM_X;
  const ramp = new THREE.CylinderGeometry(HS_TOP_X * Math.SQRT2, HS_BOTTOM_X * Math.SQRT2, H, 4, 1)
    .rotateY(Math.PI / 4)
    .scale(1, 1, zs)
    .translate(0, GROUND_Y + H / 2, 0);
  const walls: Beam[] = [];
  const dark: Beam[] = [];
  const cols: Beam[] = [];
  const tanks: THREE.BufferGeometry[] = [];
  const W = 1.9;
  const x0 = HS_TOP_X - 0.5;
  const x1 = HS_BOTTOM_X;
  const len = x1 - x0;
  const back = x1 - 1.6;
  for (const k of [-1, 1]) {
    walls.push({ p: [k * (x0 + len / 2), HARDSTAND_Y - 0.13, 0], s: [len, 0.26, W * 2] });
    for (const z of [-W + 0.15, W - 0.15]) walls.push({ p: [k * (x0 + len / 2), GROUND_Y + H / 2, z], s: [len, H, 0.3] });
    dark.push({ p: [k * (back + 0.8), GROUND_Y + 0.235, 0], s: [1.6, 0.47, W * 2 - 0.3] });
    dark.push({ p: [k * back, GROUND_Y + H / 2, 0], s: [0.1, H, W * 2 - 0.3] });
    for (const z of [-0.85, 0, 0.85]) cols.push({ p: [k * (x1 - 0.15), GROUND_Y + H / 2, z], s: [0.2, H - 0.05, 0.2] });
    for (const z of [-1.2, -0.4, 0.4, 1.2])
      tanks.push(new THREE.CylinderGeometry(0.17, 0.17, 0.62, 14).translate(k * (back + 0.55), GROUND_Y + 0.47 + 0.31, z));
  }
  // pipe runs and a stairway climbing the +z ramp
  const rampPipes: THREE.BufferGeometry[] = [];
  const zTop = HS_TOP_X * zs;
  const zBot = HS_BOTTOM_Z;
  for (const [x, r] of [[3.2, 0.06], [3.5, 0.045], [-5, 0.05]] as const)
    rampPipes.push(pipeBetween([x, HARDSTAND_Y + 0.08, zTop - 0.3], [x, GROUND_Y + 0.08, zBot + 0.6], r));
  const stairLen = Math.hypot(zBot - zTop, H);
  walls.push({ p: [-3.2, GROUND_Y + H / 2 + 0.04, (zTop + zBot) / 2], s: [0.35, 0.05, stairLen], r: [Math.atan2(H, zBot - zTop), 0, 0] });
  return {
    ramp,
    walls: mergeBeams(walls, 0.06),
    dark: mergeBeams(dark),
    cols: mergeBeams(cols, 0.05),
    tanks: mergeGeometries(tanks)!,
    pipes: mergeGeometries(rampPipes)!,
  };
}

/** Pad 39A-style launch complex with retracting access arms, crawlerway, water tower and coastline. */
export function LaunchPad({ trees = 600 }: { trees?: number }) {
  const tex = useMemo(
    () => ({
      grass: grassTexture(),
      concrete: concreteTexture(),
      gravel: gravelTexture(),
      sand: sandTexture(),
      mlp: panelTexture("#9a9ea2", "rgba(30,30,30,0.25)"),
      rss: panelTexture("#b4b6b8", "rgba(50,52,55,0.25)"),
      clad: panelTexture("#ebeae5", "rgba(70,70,70,0.2)"),
    }),
    [],
  );
  const tower = useMemo(buildTower, []);
  const platform = useMemo(buildPlatform, []);
  const rss = useMemo(buildRss, []);
  const hardstand = useMemo(buildHardstand, []);
  const shrubs = useMemo(() => buildTrees(trees, true), [trees]);
  const ocean = useMemo(createOceanMaterial, []);
  const forest = useMemo(() => buildTrees(trees), [trees]);
  const goxArm = useRef<THREE.Group>(null);
  const accessArm = useRef<THREE.Group>(null);

  const catenary = useMemo(() => {
    const top = new THREE.Vector3(TOWER_X, MAST_TOP, 0);
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
      <instancedMesh args={[shrubs.geometry, undefined, shrubs.count]} ref={shrubs.attach} receiveShadow>
        <meshStandardMaterial vertexColors={false} roughness={1} onBeforeCompile={foliage} />
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
          <meshStandardMaterial color={BUILDING_TONES[i % BUILDING_TONES.length]!} roughness={0.85} />
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
      {/* Raised hardstand with sloped ramps and flame-trench exits */}
      <mesh geometry={hardstand.ramp} receiveShadow castShadow>
        <meshStandardMaterial map={tex.concrete} color="#e6d6b4" roughness={0.95} />
      </mesh>
      <mesh geometry={hardstand.walls} receiveShadow castShadow>
        <meshStandardMaterial map={tex.concrete} color="#ddcfb0" roughness={0.95} vertexColors />
      </mesh>
      <mesh geometry={hardstand.dark}>
        <meshStandardMaterial color="#1c1a17" roughness={1} />
      </mesh>
      <mesh geometry={hardstand.cols} castShadow>
        <meshStandardMaterial map={tex.concrete} color="#cfc2a4" roughness={0.95} vertexColors />
      </mesh>
      <mesh geometry={hardstand.tanks}>
        <meshStandardMaterial color="#dedcd6" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh geometry={hardstand.pipes} castShadow>
        {white}
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
      <mesh geometry={platform.pipes} castShadow>
        {white}
      </mesh>

      {/* Fixed service structure */}
      <mesh geometry={tower.steel} castShadow>
        <meshStandardMaterial color="#c6c9cb" roughness={0.6} metalness={0.45} vertexColors />
      </mesh>
      <mesh geometry={tower.decks} castShadow receiveShadow>
        <meshStandardMaterial color="#9fa3a7" roughness={0.65} metalness={0.4} vertexColors />
      </mesh>
      <mesh geometry={tower.clad} castShadow receiveShadow>
        <meshStandardMaterial map={tex.clad} color="#f0eee8" roughness={0.75} metalness={0.1} vertexColors />
      </mesh>
      <mesh geometry={tower.pipes} castShadow>
        {white}
      </mesh>
      <mesh geometry={tower.lights}>
        <meshStandardMaterial color="#5a0b06" emissive="#ff2a1a" emissiveIntensity={2.2} />
      </mesh>
      <lineSegments geometry={tower.slidewires}>
        <lineBasicMaterial color="#4d5054" transparent opacity={0.55} />
      </lineSegments>
      {/* Lightning mast + catenary wires */}
      <mesh position={[TOWER_X, (TOWER_TOP + MAST_FOOT + MAST_TOP) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.075, MAST_TOP - TOWER_TOP - MAST_FOOT, 10]} />
        <meshStandardMaterial color="#e8e6e1" roughness={0.5} />
      </mesh>
      <mesh position={[TOWER_X, MAST_TOP + 0.05, 0]}>
        <coneGeometry args={[0.04, 0.14, 10]} />
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
        <mesh geometry={rss.clad} castShadow receiveShadow>
          <meshStandardMaterial map={tex.clad} color="#f2f0ea" roughness={0.72} metalness={0.1} vertexColors />
        </mesh>
        <mesh geometry={rss.frame} castShadow>
          <meshStandardMaterial color="#c6c9cb" roughness={0.6} metalness={0.45} vertexColors />
        </mesh>
        <mesh geometry={rss.decks} castShadow receiveShadow>
          <meshStandardMaterial color="#9fa3a7" roughness={0.65} metalness={0.4} vertexColors />
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
          [17, -17, 1.1],
        ] as const
      ).map(([x, z, r]) => (
        <group key={x} position={[x, GROUND_Y, z]}>
          <mesh position={[0, r + 0.4, 0]} castShadow>
            <sphereGeometry args={[r, 24, 16]} />
            <meshStandardMaterial color="#dcd9d0" roughness={0.6} />
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
      photo = max(mix(vec3(lum), photo, 1.35), 0.0) * vec3(0.88, 0.98, 1.06) * 1.25;
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

/** Full-sphere equirect canvas for reflections: the sky photo on top (rotated by the same offset as the sky dome) and
 *  warm scrub-and-sand tones below, so the shuttle and steel reflect the real sky over Florida ground. */
export function buildSkyEnvCanvas(img: CanvasImageSource & { width: number; height: number }, offset: number) {
  const W = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = W / 2;
  const g = c.getContext("2d")!;
  const shift = -offset * W;
  g.drawImage(img, shift, 0, W, W / 4);
  g.drawImage(img, shift - W, 0, W, W / 4);
  const ground = g.createLinearGradient(0, W / 4, 0, W / 2);
  ground.addColorStop(0, "#a7aab3");
  ground.addColorStop(0.08, "#6d6a55");
  ground.addColorStop(1, "#3a3a2a");
  g.fillStyle = ground;
  g.fillRect(0, W / 4, W, W / 4);
  return c;
}

/** Loads the photographed sky into a sky material without suspending the scene (gradient shows until it arrives). */
export function loadSkyPhoto(mat: THREE.ShaderMaterial, url: string, onLoad?: (tex: THREE.Texture) => void) {
  new THREE.TextureLoader().load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    // no mipmaps: the equirect seam would otherwise pick a tiny mip and draw a line
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    mat.uniforms["uPhoto"]!.value = tex;
    mat.uniforms["uPhotoMix"]!.value = 1;
    onLoad?.(tex);
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
    // seen from far across the marsh the Atlantic stays a deep saturated blue right up to the horizon
    vec3 col = mix(water, uSkyRefl, fres * 0.6);
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
        uDeep: { value: new THREE.Color("#0a3566") },
        uShallow: { value: new THREE.Color("#2b6f86") },
        uSkyRefl: { value: new THREE.Color("#4d7aab") },
        uSunDir: { value: new THREE.Vector3(-0.55, 0.32, 0.78).normalize() },
      },
    ]),
  });
}
