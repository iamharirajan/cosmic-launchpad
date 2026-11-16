import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Feel constants
const SPAWN_RATE = 1250; // particles per second at full thrust
const BUOYANCY = 0.95;
const DRAG = 1.1;

export const smokeVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aHeat;
  attribute float aSeed;
  varying float vAlpha;
  varying float vHeat;
  varying float vSeed;
  uniform float uScale;
  void main() {
    vAlpha = aAlpha;
    vHeat = aHeat;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;

export const smokeFragment = /* glsl */ `
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform vec3 uWarm;
  varying float vAlpha;
  varying float vHeat;
  varying float vSeed;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    // cauliflower edge: lumpy fbm boundary like a rising steam cloud
    vec2 q = c * 3.2 + vSeed * 17.0;
    float n = noise(q) * 0.6 + noise(q * 2.1) * 0.3 + noise(q * 4.3) * 0.1;
    float body = smoothstep(0.5, 0.18, d + (n - 0.5) * 0.32);
    if (body < 0.01) discard;
    // sun from upper left: bright tops, grey undersides, warm glow from the flame
    float lit = clamp(0.55 - c.y * 1.1 + c.x * -0.35 + (n - 0.5) * 0.5, 0.0, 1.0);
    vec3 col = mix(uShade, uLit, lit);
    col = mix(col, uWarm, vHeat * 0.85);
    gl_FragColor = vec4(col, body * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** weight (default 1) scales how often an emitter is picked when spawning. */
export type Emitter = { position: THREE.Vector3; direction: THREE.Vector3; weight?: number };

type SmokeProps = {
  emittersRef: { current: Emitter[] };
  rateRef: { current: number };
  /** Particle budget (set by the device quality tier). */
  count: number;
};

/** World-space exhaust and ground cloud particles. Left behind as the rocket climbs. */
export function Smoke({ emittersRef, rateRef, count: COUNT }: SmokeProps) {
  const points = useRef<THREE.Points>(null);
  const sim = useMemo(() => {
    return {
      pos: new Float32Array(COUNT * 3),
      vel: new Float32Array(COUNT * 3),
      age: new Float32Array(COUNT).fill(999),
      life: new Float32Array(COUNT).fill(1),
      size: new Float32Array(COUNT),
      alpha: new Float32Array(COUNT),
      heat: new Float32Array(COUNT),
      base: new Float32Array(COUNT),
      seed: Float32Array.from({ length: COUNT }, () => Math.random()),
      cursor: 0,
      carry: 0,
    };
  }, [COUNT]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(sim.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(sim.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(sim.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aHeat", new THREE.BufferAttribute(sim.heat, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sim.seed, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 50, 0), 400);
    return g;
  }, [sim]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: smokeVertex,
        fragmentShader: smokeFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uScale: { value: 420 },
          uLit: { value: new THREE.Color("#fbf8f2") },
          uShade: { value: new THREE.Color("#868c96") },
          uWarm: { value: new THREE.Color("#ffb779") },
        },
      }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // keep puff size consistent when the tracking camera zooms
    const fov = (state.camera as THREE.PerspectiveCamera).fov ?? 38;
    material.uniforms["uScale"]!.value = (state.size.height * 0.189) / Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    const emitters = emittersRef.current;
    const rate = rateRef.current;
    sim.carry += rate * dt * SPAWN_RATE;
    let spawn = Math.floor(sim.carry);
    sim.carry -= spawn;
    // fewer particles on light devices: each one is a little bigger so clouds keep their mass
    const sizeBoost = Math.sqrt(4200 / COUNT);
    spawn = Math.round(spawn * (COUNT / 4200));
    let totalW = 0;
    for (const e of emitters) totalW += e.weight ?? 1;
    while (spawn-- > 0 && totalW > 0) {
      let r = Math.random() * totalW;
      let e = emitters[0]!;
      for (const cand of emitters) {
        r -= cand.weight ?? 1;
        if (r <= 0) {
          e = cand;
          break;
        }
      }
      const i = sim.cursor;
      sim.cursor = (sim.cursor + 1) % COUNT;
      const j = i * 3;
      sim.pos[j] = e.position.x + (Math.random() - 0.5) * 0.15;
      sim.pos[j + 1] = e.position.y - Math.random() * 0.6;
      sim.pos[j + 2] = e.position.z + (Math.random() - 0.5) * 0.15;
      const speed = 6 + Math.random() * 5;
      sim.vel[j] = e.direction.x * speed + (Math.random() - 0.5) * 1.2;
      sim.vel[j + 1] = e.direction.y * speed + (Math.random() - 0.5) * 1.2;
      sim.vel[j + 2] = e.direction.z * speed + (Math.random() - 0.5) * 1.2;
      sim.age[i] = 0;
      sim.life[i] = 8 + Math.random() * 8;
      sim.base[i] = (1.8 + Math.random() * 2.4) * sizeBoost;
    }

    const { pos, vel, age, life, size, alpha, heat, base } = sim;
    for (let i = 0; i < COUNT; i++) {
      const a = (age[i] = age[i]! + dt);
      const l = life[i]!;
      if (a > l) {
        alpha[i] = 0;
        size[i] = 0;
        continue;
      }
      const j = i * 3;
      let x = pos[j]!;
      let y = pos[j + 1]!;
      let z = pos[j + 2]!;
      let vx = vel[j]!;
      let vy = vel[j + 1]!;
      let vz = vel[j + 2]!;
      // Deflection: most exhaust runs down the flame trench (along x) and billows out of both ends;
      // a share splashes across the launch platform deck.
      const onDeck = i % 6 === 0;
      const floor = onDeck ? 0.08 : -0.85;
      if (y < floor) {
        const down = Math.abs(vy);
        if (onDeck) {
          const side = i % 4 === 0 ? 1 : -1;
          vx = side * (down * 0.9 + 1.5 + Math.random() * 2);
          vz = (Math.random() - 0.5) * 1.5;
        } else {
          const side = i % 2 === 0 ? 1 : -1;
          vx = side * (down * 2.1 + 3 + Math.random() * 3);
          vz = (Math.random() - 0.5) * 3.5;
        }
        vy = 0.8 + Math.random() * 1.4;
        y = floor;
      }
      const drag = Math.exp(-DRAG * dt);
      vx *= drag;
      // hot steam rises harder once it has slowed down, building tall billows
      vy = vy * drag + BUOYANCY * dt * (1 + Math.min(a, 4) * 0.25);
      vz *= drag;
      x += vx * dt;
      z += 0.15 * dt; // light onshore wind
      y += vy * dt;
      z += vz * dt;
      pos[j] = x;
      pos[j + 1] = y;
      pos[j + 2] = z;
      vel[j] = vx;
      vel[j + 1] = vy;
      vel[j + 2] = vz;
      const t = a / l;
      size[i] = base[i]! * (0.7 + Math.min(a, 8) * 1.6);
      alpha[i] = Math.min(1, a * 3) * (1 - t * t) * 0.92;
      heat[i] = Math.max(0, 1 - a * 2.4) * 0.8;
    }

    for (const name of ["position", "aSize", "aAlpha", "aHeat"]) {
      geometry.getAttribute(name).needsUpdate = true;
    }
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
