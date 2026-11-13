import { useGLTF } from "@react-three/drei";
import { forwardRef, useMemo } from "react";
import * as THREE from "three";

import shuttleModel from "@/assets/models/space-shuttle.glb.asset.json";

export const ORBITER_LENGTH = 4;
const DRACO = "/draco/";

/** Orbiter GLB normalized: nose up (+Y), length ORBITER_LENGTH, belly facing -Z, tail at y=0. */
export const Orbiter = forwardRef<THREE.Group, { onReady?: () => void }>(function Orbiter(_, ref) {
  const { scene } = useGLTF(shuttleModel.url, DRACO);

  const { object, scale, offset } = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          const sm = mat as THREE.MeshStandardMaterial;
          if (sm.isMeshStandardMaterial) {
            sm.envMapIntensity = 1.2;
            sm.roughness = Math.min(sm.roughness, 0.75);
          }
        });
      }
    });
    const holder = new THREE.Group();
    holder.add(clone);
    // Model's nose points -Z with +Y up; rotate so the nose points +Y and the belly faces -Z.
    holder.rotation.set(Math.PI / 2, 0, 0);
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    const s = ORBITER_LENGTH / size.y;
    const center = box.getCenter(new THREE.Vector3());
    return {
      object: holder,
      scale: s,
      offset: new THREE.Vector3(-center.x * s, -box.min.y * s, -center.z * s),
    };
  }, [scene]);

  return (
    <group ref={ref}>
      <group position={offset} scale={scale}>
        <primitive object={object} />
      </group>
    </group>
  );
});

useGLTF.preload(shuttleModel.url, DRACO);

/** Procedural external tank: orange foam-insulated cylinder with ogive nose. */
export function ExternalTank() {
  const points = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    const r = 0.42;
    pts.push(new THREE.Vector2(0, 0));
    pts.push(new THREE.Vector2(r * 0.85, 0));
    pts.push(new THREE.Vector2(r, 0.08));
    pts.push(new THREE.Vector2(r, 3.9));
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      pts.push(new THREE.Vector2(r * Math.cos(t * Math.PI * 0.5) ** 0.8, 3.9 + t * 1.15));
    }
    return pts;
  }, []);
  const foam = useMemo(() => makeFoamTexture(), []);
  return (
    <mesh castShadow receiveShadow>
      <latheGeometry args={[points, 48]} />
      <meshStandardMaterial color="#c96a2e" map={foam} roughness={0.92} metalness={0} />
    </mesh>
  );
}

/** Procedural solid rocket booster. */
export function Booster() {
  const points = useMemo(() => {
    const r = 0.19;
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0.26, -0.2),
      new THREE.Vector2(0.24, -0.05),
      new THREE.Vector2(r, 0.05),
      new THREE.Vector2(r, 4.2),
    ];
    for (let i = 1; i <= 12; i++) {
      const t = i / 12;
      pts.push(new THREE.Vector2(r * (1 - t) ** 0.6, 4.2 + t * 0.55));
    }
    return pts;
  }, []);
  return (
    <group>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[points, 32]} />
        <meshStandardMaterial color="#eeeae2" roughness={0.55} metalness={0.05} />
      </mesh>
      {[1.1, 2.2, 3.3].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.197, 0.197, 0.05, 32]} />
          <meshStandardMaterial color="#b9b5ad" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.24, 0.27, 0.18, 32, 1, true]} />
        <meshStandardMaterial color="#2b2b2e" roughness={0.4} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function makeFoamTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 9000; i++) {
    const v = 200 + Math.random() * 55;
    g.fillStyle = `rgb(${v},${v - 8},${v - 18})`;
    g.fillRect(Math.random() * 256, Math.random() * 512, 2 + Math.random() * 3, 1 + Math.random() * 2);
  }
  for (let y = 0; y < 512; y += 64) {
    g.fillStyle = "rgba(120,80,50,0.25)";
    g.fillRect(0, y, 256, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
