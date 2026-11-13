import { useGLTF } from "@react-three/drei";
import { useLayoutEffect, useMemo, type RefObject } from "react";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import shuttleModel from "@/assets/models/space-shuttle.glb.asset.json";

import { Flame } from "./Flame";
import { createPartMaterial, type PartKind } from "./shuttleMaterials";

const DRACO = "/draco/";
/** Full stack height (SRB nozzles to ET nose) in scene units. */
export const STACK_HEIGHT = 5.1;
/** Scene y of the lowest point (SRB nozzle exits). */
const STACK_BASE_Y = -0.2;

// Mesh indices inside the GLB (verified from its accessor bounds).
const ET_MESH = 16;
const SRB_MESH = 74;
const ENGINE_MESHES = new Set([0, 1, 2, 3, 4, 5, 6, 7, 174]);
const SSME_MESHES = [0, 5, 7];

/** Mutable layout shared with the render loop (stack-local scene units). */
export type StackLayout = {
  srbL: THREE.Vector3;
  srbR: THREE.Vector3;
  tank: THREE.Vector3;
  loaded: boolean;
};

export const createStackLayout = (): StackLayout => ({
  srbL: new THREE.Vector3(-0.65, STACK_BASE_Y, 0),
  srbR: new THREE.Vector3(0.65, STACK_BASE_Y, 0),
  tank: new THREE.Vector3(0, 0.15, 0),
  loaded: false,
});

type Part = "orbiter" | "tank" | "srbL" | "srbR";

function meshIndexOf(gltf: GLTF, o: THREE.Object3D): number | undefined {
  let cur: THREE.Object3D | null = o;
  while (cur) {
    const a = gltf.parser.associations.get(cur) as { meshes?: number } | undefined;
    if (a?.meshes !== undefined) return a.meshes;
    cur = cur.parent;
  }
  return undefined;
}

/** Split a geometry's triangles into buckets by their centroid. */
function splitByCentroid(geom: THREE.BufferGeometry, bucket: (c: THREE.Vector3) => number, n: number) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const out: number[][][] = Array.from({ length: n }, () => [[], []]);
  const c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.x += pos.getX(i + k) / 3, c.y += pos.getY(i + k) / 3, c.z += pos.getZ(i + k) / 3;
    const b = out[bucket(c)]!;
    for (let k = 0; k < 3; k++) {
      b[0]!.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      b[1]!.push(nor.getX(i + k), nor.getY(i + k), nor.getZ(i + k));
    }
  }
  return out.map(([p, nn]) => {
    const r = new THREE.BufferGeometry();
    r.setAttribute("position", new THREE.Float32BufferAttribute(p!, 3));
    r.setAttribute("normal", new THREE.Float32BufferAttribute(nn!, 3));
    return r;
  });
}

function buildStack(gltf: GLTF) {
  const materials: Record<PartKind, THREE.Material> = {
    orbiter: createPartMaterial("orbiter"),
    tank: createPartMaterial("tank"),
    booster: createPartMaterial("booster"),
    engine: createPartMaterial("engine"),
    glass: createPartMaterial("glass"),
  };
  const pieces: Record<Part, THREE.Mesh[]> = { orbiter: [], tank: [], srbL: [], srbR: [] };
  const ssmeBoxes: THREE.Box3[] = [];

  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o) => {
    const src = o as THREE.Mesh;
    if (!src.isMesh) return;
    const idx = meshIndexOf(gltf, src);
    let geom = src.geometry.clone();
    if (!src.matrixWorld.equals(new THREE.Matrix4())) geom.applyMatrix4(src.matrixWorld);
    if (!geom.getAttribute("normal")) geom.computeVertexNormals();
    const srcMat = (Array.isArray(src.material) ? src.material[0] : src.material) as THREE.Material;

    const add = (part: Part, g: THREE.BufferGeometry, kind: PartKind) => {
      const m = new THREE.Mesh(g, materials[kind]);
      m.castShadow = true;
      m.receiveShadow = true;
      pieces[part].push(m);
    };

    if (idx === ET_MESH) return add("tank", geom, "tank");
    if (idx === SRB_MESH) {
      const [l, r, mid] = splitByCentroid(geom, (c) => (c.x < -3.4 ? 0 : c.x > 3.4 ? 1 : 2), 3);
      add("srbL", l!, "booster");
      add("srbR", r!, "booster");
      if (mid!.getAttribute("position").count) add("tank", mid!, "engine");
      return;
    }
    if (idx !== undefined && ENGINE_MESHES.has(idx)) {
      if (SSME_MESHES.includes(idx)) {
        geom.computeBoundingBox();
        ssmeBoxes.push(geom.boundingBox!.clone());
      }
      return add("orbiter", geom, "engine");
    }
    if (srcMat?.name?.startsWith("anisotropic")) return add("orbiter", geom, "glass");
    geom = geom;
    add("orbiter", geom, "orbiter");
  });

  // Model -> stack transform: nose (-Z) to +Y, belly (-Y) to -Z, scaled and centred on the tank axis.
  const rot = new THREE.Matrix4().makeRotationX(Math.PI / 2);
  const all = new THREE.Box3();
  const boxOf = (meshes: THREE.Mesh[]) => {
    const b = new THREE.Box3();
    meshes.forEach((m) => {
      m.geometry.computeBoundingBox();
      b.union(m.geometry.boundingBox!.clone().applyMatrix4(rot));
    });
    return b;
  };
  const boxes = {
    orbiter: boxOf(pieces.orbiter),
    tank: boxOf(pieces.tank),
    srbL: boxOf(pieces.srbL),
    srbR: boxOf(pieces.srbR),
  };
  Object.values(boxes).forEach((b) => all.union(b));
  const s = STACK_HEIGHT / all.getSize(new THREE.Vector3()).y;
  const tankC = boxes.tank.getCenter(new THREE.Vector3());
  const offset = new THREE.Vector3(-tankC.x * s, STACK_BASE_Y - all.min.y * s, -tankC.z * s);
  const M = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z).multiply(new THREE.Matrix4().makeScale(s, s, s)).multiply(rot);
  const toStack = (v: THREE.Vector3) => v.clone().applyMatrix4(new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z).multiply(new THREE.Matrix4().makeScale(s, s, s)));

  // Each part's local origin is its bottom-centre so separation rotates naturally.
  const baseOf = (b: THREE.Box3) => {
    const c = b.getCenter(new THREE.Vector3());
    return toStack(new THREE.Vector3(c.x, b.min.y, c.z));
  };
  const bases: Record<Part, THREE.Vector3> = {
    orbiter: new THREE.Vector3(0, 0, 0),
    tank: baseOf(boxes.tank),
    srbL: baseOf(boxes.srbL),
    srbR: baseOf(boxes.srbR),
  };
  const groups = {} as Record<Part, THREE.Group>;
  (Object.keys(pieces) as Part[]).forEach((k) => {
    const inner = new THREE.Group();
    inner.matrixAutoUpdate = false;
    inner.matrix.copy(new THREE.Matrix4().makeTranslation(-bases[k].x, -bases[k].y, -bases[k].z).multiply(M));
    pieces[k].forEach((m) => inner.add(m));
    groups[k] = inner;
  });

  const ssme = ssmeBoxes.map((b) => {
    const c = b.getCenter(new THREE.Vector3());
    const v = new THREE.Vector3(c.x, c.y, b.max.z).applyMatrix4(M);
    return [v.x, v.y + 0.02, v.z] as [number, number, number];
  });
  const srbNozzleRadius = (boxes.srbL.max.x - boxes.srbL.min.x) * s * 0.34;
  return { groups, bases, ssme, srbNozzleRadius };
}

type StackProps = {
  tankRef: RefObject<THREE.Group | null>;
  srbLRef: RefObject<THREE.Group | null>;
  srbRRef: RefObject<THREE.Group | null>;
  layout: StackLayout;
  srbThrust: { current: number };
  ssmeThrust: { current: number };
};

/** The full shuttle stack from the GLB: orbiter, external tank and two SRBs with engine plumes. */
export function ShuttleStack({ tankRef, srbLRef, srbRRef, layout, srbThrust, ssmeThrust }: StackProps) {
  const gltf = useGLTF(shuttleModel.url, DRACO) as unknown as GLTF;
  const stack = useMemo(() => buildStack(gltf), [gltf]);

  useLayoutEffect(() => {
    layout.srbL.copy(stack.bases.srbL);
    layout.srbR.copy(stack.bases.srbR);
    layout.tank.copy(stack.bases.tank);
    layout.loaded = true;
  }, [layout, stack]);

  const srbFlame = (
    <Flame position={[0, 0.03, 0]} length={6} radius={stack.srbNozzleRadius * 1.25} intensityRef={srbThrust} />
  );

  return (
    <>
      <group ref={tankRef} position={stack.bases.tank}>
        <primitive object={stack.groups.tank} />
      </group>
      <group ref={srbLRef} position={stack.bases.srbL}>
        <primitive object={stack.groups.srbL} />
        {srbFlame}
      </group>
      <group ref={srbRRef} position={stack.bases.srbR}>
        <primitive object={stack.groups.srbR} />
        {srbFlame}
      </group>
      <group>
        <primitive object={stack.groups.orbiter} />
        {stack.ssme.map((pos, i) => (
          <Flame
            key={i}
            position={pos}
            length={2.4}
            radius={0.09}
            spread={1.6}
            core="#f4f7ff"
            mid="#a9c6ff"
            tail="#ff7a3c"
            gain={0.4}
            intensityRef={ssmeThrust}
          />
        ))}
      </group>
    </>
  );
}

useGLTF.preload(shuttleModel.url, DRACO);
