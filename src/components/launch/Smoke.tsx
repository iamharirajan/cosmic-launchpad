import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const COUNT = 2200;

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aHeat;
  varying float vAlpha;
  varying float vHeat;
  uniform float uScale;
  void main() {
    vAlpha = aAlpha;
    vHeat = aHeat;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uLit;
  uniform vec3 uShade;
  varying float vAlpha;
  varying float vHeat;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    float shade = clamp(0.5 - c.y * 0.9, 0.0, 1.0);
    vec3 col = mix(uShade, uLit, shade);
    col = mix(col, vec3(1.0, 0.62, 0.25) * 1.6, vHeat);
    gl_FragColor = vec4(col, soft * soft * vAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export type Emitter = { position: THREE.Vector3; direction: THREE.Vector3 };

type SmokeProps = {
  emittersRef: { current: Emitter[] };
  rateRef: { current: number };
};

/** World-space exhaust and ground cloud particles. Left behind as the rocket climbs. */
export function Smoke({ emittersRef, rateRef }: SmokeProps) {
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
      cursor: 0,
      carry: 0,
    };
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(sim.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(sim.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(sim.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aHeat", new THREE.BufferAttribute(sim.heat, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 50, 0), 400);
    return g;
  }, [sim]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uScale: { value: 420 },
          uLit: { value: new THREE.Color("#f3ece4") },
          uShade: { value: new THREE.Color("#8a8f9a") },
        },
      }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    material.uniforms["uScale"]!.value = state.size.height * 0.55;
    const emitters = emittersRef.current;
    const rate = rateRef.current;
    sim.carry += rate * dt * 900;
    let spawn = Math.floor(sim.carry);
    sim.carry -= spawn;
    while (spawn-- > 0 && emitters.length) {
      const e = emitters[spawn % emitters.length]!;
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
      sim.life[i] = 6 + Math.random() * 7;
      sim.base[i] = 1.4 + Math.random() * 1.8;
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
      // Deflection: most exhaust runs down the flame trench (along z) and billows out of both ends;
      // a share splashes across the launch platform deck.
      const onDeck = i % 3 === 0;
      const floor = onDeck ? 0.08 : -0.85;
      if (y < floor) {
        const down = Math.abs(vy);
        if (onDeck) {
          const len = Math.hypot(vx, vz) || 1;
          vx = (vx / len) * down * 1.1 + (Math.random() - 0.5) * 3;
          vz = (vz / len) * down * 1.1 + (Math.random() - 0.5) * 3;
        } else {
          const side = i % 2 === 0 ? 1 : -1;
          vz = side * (down * 1.7 + 2 + Math.random() * 2);
          vx = (Math.random() - 0.5) * 2.5;
        }
        vy = 0.4 + Math.random() * 0.6;
        y = floor;
      }
      const drag = Math.exp(-1.4 * dt);
      vx *= drag;
      vy = vy * drag + 0.25 * dt; // gentle buoyancy
      vz *= drag;
      x += vx * dt + 0.15 * dt; // light wind
      y += vy * dt;
      z += vz * dt;
      pos[j] = x;
      pos[j + 1] = y;
      pos[j + 2] = z;
      vel[j] = vx;
      vel[j + 1] = vy;
      vel[j + 2] = vz;
      const t = a / l;
      size[i] = base[i]! * (0.7 + a * 1.4);
      alpha[i] = Math.min(1, a * 3) * (1 - t) * 0.7;
      heat[i] = Math.max(0, 1 - a * 2.2) * 0.9;
    }

    for (const name of ["position", "aSize", "aAlpha", "aHeat"]) {
      geometry.getAttribute(name).needsUpdate = true;
    }
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}
