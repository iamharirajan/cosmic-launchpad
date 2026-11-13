import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  void main() {
    vUv = uv;
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uCore;
  uniform vec3 uMid;
  uniform vec3 uTail;
  uniform float uSeed;
  varying vec2 vUv;
  varying vec3 vNormalV;
  void main() {
    float along = 1.0 - vUv.y;
    float rim = pow(abs(normalize(vNormalV).z), 1.4);
    float flick = 0.82 + 0.18 * sin(uTime * 47.0 + along * 26.0 + uSeed) * sin(uTime * 23.0 + uSeed * 3.0);
    float diamonds = 0.85 + 0.15 * sin(along * 38.0 - uTime * 6.0);
    vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.3, along));
    col = mix(col, uTail, smoothstep(0.3, 1.0, along));
    float a = (1.0 - smoothstep(0.15, 1.0, along)) * rim * uIntensity * flick * diamonds;
    gl_FragColor = vec4(col * a * 1.8, a);
  }
`;

type FlameProps = {
  length: number;
  radius: number;
  intensityRef: { current: number };
  core?: string;
  mid?: string;
  tail?: string;
  position?: [number, number, number];
  spread?: number;
};

/** Additive exhaust plume hanging below a nozzle at the local origin. */
export function Flame({
  length,
  radius,
  intensityRef,
  core = "#fff6dc",
  mid = "#ffb040",
  tail = "#ff4a10",
  position = [0, 0, 0],
  spread = 1.9,
}: FlameProps) {
  const group = useRef<THREE.Group>(null);
  const layers = useMemo(() => {
    const make = (r: number, len: number, s: number) => {
      const g = new THREE.CylinderGeometry(r, r * s, len, 24, 12, true);
      g.translate(0, -len / 2, 0);
      return g;
    };
    return [make(radius * 0.55, length * 0.6, spread * 0.8), make(radius, length, spread)];
  }, [length, radius, spread]);

  const materials = useMemo(
    () =>
      layers.map(
        (_, i) =>
          new THREE.ShaderMaterial({
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            uniforms: {
              uTime: { value: 0 },
              uIntensity: { value: 0 },
              uCore: { value: new THREE.Color(core) },
              uMid: { value: new THREE.Color(i === 0 ? core : mid) },
              uTail: { value: new THREE.Color(tail) },
              uSeed: { value: Math.random() * 10 },
            },
          }),
      ),
    [layers, core, mid, tail],
  );

  useFrame((state) => {
    const k = intensityRef.current;
    materials.forEach((m, i) => {
      m.uniforms["uTime"]!.value = state.clock.elapsedTime;
      m.uniforms["uIntensity"]!.value = k * (i === 0 ? 1.2 : 0.75);
    });
    if (group.current) {
      const s = 0.25 + 0.75 * k;
      group.current.scale.set(1, s * (0.96 + Math.random() * 0.08), 1);
      group.current.visible = k > 0.01;
    }
  });

  return (
    <group ref={group} position={position}>
      {layers.map((g, i) => (
        <mesh key={i} geometry={g} material={materials[i]!} renderOrder={10} />
      ))}
    </group>
  );
}
