import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";

import { smokeFragment, smokeVertex } from "./Smoke";

// Feel constants
const STEP = 0.22; // world units of climb between trail puffs
const LIFE = 34; // seconds a puff lingers in the air
const GROWTH = 0.9; // size growth per second (the column widens as it drifts)

type TrailProps = {
  /** World position between the booster nozzles. */
  sourceRef: { current: THREE.Vector3 };
  /** 0..1 — how strongly the column is being laid down (booster thrust while in the atmosphere). */
  activeRef: { current: number };
  count: number;
};

/** The long exhaust column a climbing shuttle leaves hanging in the sky. Puffs are laid by distance, not time. */
export function Trail({ sourceRef, activeRef, count }: TrailProps) {
  const sim = useMemo(
    () => ({
      pos: new Float32Array(count * 3),
      vel: new Float32Array(count * 3),
      age: new Float32Array(count).fill(999),
      size: new Float32Array(count),
      alpha: new Float32Array(count),
      heat: new Float32Array(count),
      base: new Float32Array(count),
      seed: Float32Array.from({ length: count }, () => Math.random()),
      cursor: 0,
      last: new THREE.Vector3(Number.NaN, 0, 0),
    }),
    [count],
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(sim.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSize", new THREE.BufferAttribute(sim.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(sim.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aHeat", new THREE.BufferAttribute(sim.heat, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sim.seed, 1));
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
          uLit: { value: new THREE.Color("#fbf9f5") },
          uShade: { value: new THREE.Color("#9aa1ab") },
          uWarm: { value: new THREE.Color("#ffd6a0") },
        },
      }),
    [],
  );

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    material.uniforms["uScale"]!.value = state.size.height * 0.55;
    const src = sourceRef.current;
    const active = activeRef.current;

    if (active < 0.3 || src.y < 1.2) {
      sim.last.set(Number.NaN, 0, 0);
    } else if (Number.isNaN(sim.last.x)) {
      sim.last.copy(src);
    } else {
      // lay puffs evenly along the path travelled since last frame
      let dist = sim.last.distanceTo(src);
      while (dist >= STEP) {
        sim.last.lerp(src, STEP / dist);
        dist -= STEP;
        const i = sim.cursor;
        sim.cursor = (sim.cursor + 1) % count;
        const j = i * 3;
        tmp.copy(sim.last);
        sim.pos[j] = tmp.x + (Math.random() - 0.5) * 0.12;
        sim.pos[j + 1] = tmp.y;
        sim.pos[j + 2] = tmp.z + (Math.random() - 0.5) * 0.12;
        sim.vel[j] = (Math.random() - 0.5) * 0.5;
        sim.vel[j + 1] = -0.6 - Math.random() * 0.6;
        sim.vel[j + 2] = (Math.random() - 0.5) * 0.5;
        sim.age[i] = 0;
        sim.base[i] = 0.9 + Math.random() * 0.7;
      }
    }

    const { pos, vel, age, size, alpha, heat, base } = sim;
    const drag = Math.exp(-0.8 * dt);
    for (let i = 0; i < count; i++) {
      const a = (age[i] = age[i]! + dt);
      if (a > LIFE) {
        alpha[i] = 0;
        size[i] = 0;
        continue;
      }
      const j = i * 3;
      vel[j] = vel[j]! * drag;
      vel[j + 1] = vel[j + 1]! * drag;
      vel[j + 2] = vel[j + 2]! * drag;
      pos[j] = pos[j]! + vel[j]! * dt + 0.12 * dt; // high-altitude wind shear slowly bends the column
      pos[j + 1] = pos[j + 1]! + vel[j + 1]! * dt;
      pos[j + 2] = pos[j + 2]! + vel[j + 2]! * dt;
      const t = a / LIFE;
      size[i] = base[i]! * (1 + Math.min(a, 20) * GROWTH);
      alpha[i] = Math.min(1, a * 4) * (1 - t * t) * 0.8;
      heat[i] = Math.max(0, 1 - a * 3) * 0.9;
    }
    for (const name of ["position", "aSize", "aAlpha", "aHeat"]) geometry.getAttribute(name).needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}
