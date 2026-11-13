import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import dayTex from "@/assets/textures/earth_atmos_2048.jpg.asset.json";
import nightTex from "@/assets/textures/earth_lights_2048.png.asset.json";
import specTex from "@/assets/textures/earth_specular_2048.jpg.asset.json";
import cloudTex from "@/assets/textures/earth_clouds_1024.png.asset.json";

export const SUN_DIR = new THREE.Vector3(-1, 0.35, 0.55).normalize();

const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const earthFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uSpec;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float ndl = dot(n, uSun);
    float day = smoothstep(-0.18, 0.28, ndl);
    vec3 dayCol = texture2D(uDay, vUv).rgb * (0.08 + 1.25 * max(ndl, 0.0));
    vec3 nightCol = texture2D(uNight, vUv).rgb * vec3(1.0, 0.75, 0.45) * 1.8;
    vec3 col = mix(nightCol, dayCol, day);
    vec3 h = normalize(uSun + v);
    float spec = pow(max(dot(n, h), 0.0), 60.0) * texture2D(uSpec, vUv).r * day;
    col += vec3(1.0, 0.88, 0.7) * spec * 0.9;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
    float twilight = smoothstep(-0.25, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.35, ndl));
    col += mix(vec3(0.25, 0.55, 1.0), vec3(1.0, 0.5, 0.2), twilight) * fres * (0.15 + 0.85 * day);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmoVertex = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vPosW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const atmoFragment = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float d = -dot(n, v);
    float edge = pow(smoothstep(0.0, 0.46, d), 2.2);
    float lit = smoothstep(-0.45, 0.6, dot(n, uSun));
    vec3 col = mix(vec3(0.12, 0.3, 0.9), vec3(0.45, 0.75, 1.0), lit);
    float a = edge * (0.12 + 0.95 * lit);
    gl_FragColor = vec4(col * a * 2.2, a);
  }
`;

export function Earth({ radius, position }: { radius: number; position: [number, number, number] }) {
  const textures = useTexture([dayTex.url, nightTex.url, specTex.url, cloudTex.url]);
  const day = textures[0]!;
  const night = textures[1]!;
  const spec = textures[2]!;
  const clouds = textures[3]!;
  const earth = useRef<THREE.Mesh>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);

  const earthMat = useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace;
    night.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = 8;
    return new THREE.ShaderMaterial({
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
      uniforms: {
        uDay: { value: day },
        uNight: { value: night },
        uSpec: { value: spec },
        uSun: { value: SUN_DIR },
      },
    });
  }, [day, night, spec]);

  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmoVertex,
        fragmentShader: atmoFragment,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uSun: { value: SUN_DIR } },
      }),
    [],
  );

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    if (earth.current) earth.current.rotation.y += d * 0.012;
    if (cloudMesh.current) cloudMesh.current.rotation.y += d * 0.017;
  });

  clouds.colorSpace = THREE.SRGBColorSpace;

  return (
    <group position={position} rotation={[0.35, 0, 0.12]}>
      <mesh ref={earth} material={earthMat} rotation={[0, -1.9, 0]}>
        <sphereGeometry args={[radius, 128, 128]} />
      </mesh>
      <mesh ref={cloudMesh} rotation={[0, -1.9, 0]}>
        <sphereGeometry args={[radius * 1.008, 96, 96]} />
        <meshLambertMaterial map={clouds} alphaMap={clouds} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh material={atmoMat} scale={1.12}>
        <sphereGeometry args={[radius, 96, 96]} />
      </mesh>
    </group>
  );
}
