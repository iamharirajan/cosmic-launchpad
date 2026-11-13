import { useMemo } from "react";
import * as THREE from "three";

function groundTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b79f7c";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40000; i++) {
    const v = Math.random();
    g.fillStyle = v > 0.5 ? `rgba(255,240,215,${Math.random() * 0.18})` : `rgba(90,70,50,${Math.random() * 0.18})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(120,95,70,${0.05 + Math.random() * 0.08})`;
    g.lineWidth = 2 + Math.random() * 6;
    g.beginPath();
    const y = Math.random() * 512;
    g.moveTo(0, y);
    g.bezierCurveTo(170, y + (Math.random() - 0.5) * 60, 340, y + (Math.random() - 0.5) * 60, 512, y);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(60, 60);
  t.anisotropy = 8;
  return t;
}

function concreteTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9a9894";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i++) {
    const v = 120 + Math.random() * 60;
    g.fillStyle = `rgba(${v},${v},${v - 4},0.25)`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  g.strokeStyle = "rgba(60,60,60,0.35)";
  for (let x = 0; x <= 256; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 256);
    g.moveTo(0, x);
    g.lineTo(256, x);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** Ground, pad and a lattice service tower. */
export function LaunchPad() {
  const ground = useMemo(groundTexture, []);
  const concrete = useMemo(concreteTexture, []);

  const tower = useMemo(() => {
    const parts: { p: [number, number, number]; s: [number, number, number]; r?: [number, number, number] }[] = [];
    const h = 6.8;
    const w = 0.9;
    const cx = -1.75;
    for (const dx of [-w / 2, w / 2])
      for (const dz of [-w / 2, w / 2]) parts.push({ p: [cx + dx, h / 2, dz], s: [0.07, h, 0.07] });
    for (let y = 0.5; y < h; y += 0.55) {
      parts.push({ p: [cx, y, w / 2], s: [w, 0.04, 0.04] });
      parts.push({ p: [cx, y, -w / 2], s: [w, 0.04, 0.04] });
      parts.push({ p: [cx + w / 2, y, 0], s: [0.04, 0.04, w] });
      parts.push({ p: [cx - w / 2, y, 0], s: [0.04, 0.04, w] });
      parts.push({ p: [cx, y + 0.27, w / 2], s: [0.03, 0.78, 0.03], r: [0, 0, 0.9] });
      parts.push({ p: [cx, y + 0.27, -w / 2], s: [0.03, 0.78, 0.03], r: [0, 0, -0.9] });
    }
    parts.push({ p: [cx + 0.85, 4.6, 0.2], s: [1.0, 0.12, 0.35] });
    parts.push({ p: [cx + 0.85, 5.3, 0], s: [0.9, 0.08, 0.2] });
    parts.push({ p: [cx, h + 0.4, 0], s: [0.06, 0.8, 0.06] });
    return parts;
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow>
        <circleGeometry args={[900, 64]} />
        <meshStandardMaterial map={ground} roughness={1} color="#d8c4a2" />
      </mesh>
      <mesh position={[0, -0.18, 0]} receiveShadow castShadow>
        <boxGeometry args={[7, 0.3, 7]} />
        <meshStandardMaterial map={concrete} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[2.2, 0.05, 1.2]} />
        <meshStandardMaterial color="#1d1c1b" roughness={0.9} />
      </mesh>
      {tower.map((t, i) => (
        <mesh key={i} position={t.p} rotation={t.r ?? [0, 0, 0]} castShadow>
          <boxGeometry args={t.s} />
          <meshStandardMaterial color={i % 7 === 0 ? "#b5442c" : "#8d8f93"} roughness={0.6} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[-1.75, 7.25, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#ff3a2a" />
      </mesh>
      {/* distant water tower & sound suppression tanks */}
      <mesh position={[9, 2.2, -14]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 1.2, 24]} />
        <meshStandardMaterial color="#d9d7d2" roughness={0.6} />
      </mesh>
      <mesh position={[9, 0.8, -14]}>
        <cylinderGeometry args={[0.08, 0.08, 2.2, 8]} />
        <meshStandardMaterial color="#77797d" />
      </mesh>
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
    col += vec3(1.0, 0.75, 0.45) * (pow(sun, 8.0) * 0.35 + pow(sun, 600.0) * 3.0);
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
