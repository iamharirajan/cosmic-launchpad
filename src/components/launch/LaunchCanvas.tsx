import { Environment, Lightformer, PerformanceMonitor, Stars } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Earth, SUN_DIR } from "./Earth";
import { LaunchPad, createSkyMaterial } from "./LaunchPad";
import { ShuttleStack, createStackLayout } from "./Shuttle";
import { QUALITY, pickTier, readDeviceHints, type QualitySettings } from "./quality";
import { Smoke, type Emitter } from "./Smoke";
import { Trail } from "./Trail";
import {
  IGNITION_AT,
  LIFTOFF_AT,
  PHASE_SWITCH,
  ascent,
  launchState,
  orbital,
  smooth,
} from "./timeline";

// Feel constants
const ASCENT_HEIGHT = 75;
const MAX_TILT = 0.55;
const ROLL = Math.PI / 2; // roll program: orbiter swings to the downrange side (heads-down) after clearing the tower
const BASE_FOV = 38;
const MIN_FOV = 6;
/** Half-height (world units) the tracking camera keeps framed around the stack. */
const FRAME_HALF = 5.2;
const SCROLL_DAMP = 4.5;

const PAD_SUN = new THREE.Vector3(-0.55, 0.32, 0.78).normalize();

const SKY = {
  zenithLow: new THREE.Color("#2f62a6"),
  zenithHigh: new THREE.Color("#02040c"),
  horizonLow: new THREE.Color("#9fb9d2"),
  horizonHigh: new THREE.Color("#1d3d78"),
};

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

function Scene({ onReady, quality }: { onReady: () => void; quality: QualitySettings }) {
  const { camera, scene } = useThree();
  const smoothP = useRef(launchState.progress);

  const stack = useRef<THREE.Group>(null);
  const srbL = useRef<THREE.Group>(null);
  const srbR = useRef<THREE.Group>(null);
  const tank = useRef<THREE.Group>(null);
  const ground = useRef<THREE.Group>(null);
  const space = useRef<THREE.Group>(null);
  const sky = useRef<THREE.Mesh>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const engineLight = useRef<THREE.PointLight>(null);
  const layout = useMemo(createStackLayout, []);

  const srbThrust = useRef(0);
  const ssmeThrust = useRef(0);
  const smokeRate = useRef(0);
  const trailSource = useRef(new THREE.Vector3());
  const trailActive = useRef(0);
  const emitters = useRef<Emitter[]>([
    { position: new THREE.Vector3(), direction: new THREE.Vector3(0, -1, 0) },
    { position: new THREE.Vector3(), direction: new THREE.Vector3(0, -1, 0) },
    // main-engine start: steam from the sound-suppression water under the orbiter
    { position: new THREE.Vector3(), direction: new THREE.Vector3(0, -1, 0), weight: 0 },
  ]);

  const skyMat = useMemo(createSkyMaterial, []);
  const fog = useMemo(() => new THREE.Fog("#9fb9d2", 40, 600), []);

  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    smoothP.current += (launchState.progress - smoothP.current) * (1 - Math.exp(-SCROLL_DAMP * dt));
    if (launchState.snap) smoothP.current = launchState.progress;
    const p = smoothP.current;
    const inSpace = p >= PHASE_SWITCH;
    const a = ascent(p);
    const b = orbital(p);

    if (ground.current) ground.current.visible = !inSpace;
    if (space.current) space.current.visible = inSpace;
    if (sky.current) sky.current.visible = !inSpace;
    scene.fog = inSpace ? null : fog;

    // --- Engine state -------------------------------------------------------
    const srbSep = smooth(0.06, 0.4, b);
    const etSep = smooth(0.48, 0.8, b);
    const ssmeOn = smooth(IGNITION_AT - 0.01, IGNITION_AT + 0.015, p) * (1 - smooth(0.46, 0.49, b));
    const srbOn = smooth(LIFTOFF_AT - 0.02, LIFTOFF_AT, p) * (1 - smooth(0.04, 0.08, b));
    ssmeThrust.current = ssmeOn;
    srbThrust.current = srbOn * (inSpace ? 0.75 : 1);
    const steam = ssmeOn * (1 - smooth(0, 0.12, a));
    smokeRate.current = inSpace ? 0 : srbOn * (1 - smooth(0.55, 1, a) * 0.85) + steam * 0.45;
    emitters.current[2]!.weight = steam * (1 - srbOn * 0.6);

    // --- Stack transform ----------------------------------------------------
    const st = stack.current;
    if (st) {
      if (!inSpace) {
        const lift = Math.pow(a, 2.2) * ASCENT_HEIGHT;
        const tilt = -MAX_TILT * Math.pow(a, 1.5);
        const shake = srbOn * (1 - a) * 0.012;
        const roll = ROLL * smooth(0.03, 0.16, a) * (1 - smooth(0.85, 1, a));
        st.position.set(Math.pow(a, 3) * 14 + (Math.random() - 0.5) * shake, lift, 0);
        st.rotation.order = "ZYX";
        st.rotation.set(0, roll, tilt);
      } else {
        const turn = -MAX_TILT - (Math.PI / 2 - 0.2 - MAX_TILT) * smooth(0.15, 0.95, b);
        st.position.set(b * 3, Math.sin(t * 0.4) * 0.05, 0);
        st.rotation.set(0, 0, turn);
      }
      st.updateMatrixWorld(true);

      // boosters & tank separation (only meaningful in space)
      const sepK = inSpace ? srbSep : 0;
      const etK = inSpace ? etSep : 0;
      if (srbL.current && srbR.current) {
        srbL.current.position.copy(layout.srbL).add(tmpV.set(-2.6 * sepK, -4.5 * Math.pow(sepK, 1.4), 0.4 * sepK));
        srbL.current.rotation.set(0, 0, 0.9 * sepK);
        srbR.current.position.copy(layout.srbR).add(tmpV.set(2.6 * sepK, -4.5 * Math.pow(sepK, 1.4), -0.4 * sepK));
        srbR.current.rotation.set(0, 0, -0.9 * sepK);
        srbL.current.visible = srbR.current.visible = sepK < 0.995;
      }
      if (tank.current) {
        tank.current.position.copy(layout.tank).add(tmpV.set(0, -2.2 * etK, -3.2 * etK));
        tank.current.rotation.set(-0.5 * etK, 0, 0.2 * etK);
        tank.current.visible = etK < 0.995;
      }

      // smoke emitters at the booster nozzles in world space
      const dir = tmpV2.set(0, -1, 0).applyQuaternion(st.quaternion);
      emitters.current[0]!.position.copy(layout.srbL).setY(layout.srbL.y - 0.1).applyMatrix4(st.matrixWorld);
      emitters.current[1]!.position.copy(layout.srbR).setY(layout.srbR.y - 0.1).applyMatrix4(st.matrixWorld);
      emitters.current[2]!.position.set(0, layout.srbL.y + 0.25, 0.55).applyMatrix4(st.matrixWorld);
      emitters.current.forEach((e) => e.direction.copy(dir));
      trailSource.current.copy(emitters.current[0]!.position).add(emitters.current[1]!.position).multiplyScalar(0.5);
      trailActive.current = inSpace ? 0 : srbOn;

      if (engineLight.current) {
        engineLight.current.position.set(0, -1.2, 0).applyMatrix4(st.matrixWorld);
        engineLight.current.intensity = (srbThrust.current * 32 + ssmeOn * 6) * (0.85 + Math.random() * 0.3);
      }
    }

    // --- Sky & light by altitude -------------------------------------------
    if (!inSpace) {
      const alt = smooth(0.05, 1, a);
      const zen = skyMat.uniforms["uZenith"]!.value as THREE.Color;
      const hor = skyMat.uniforms["uHorizon"]!.value as THREE.Color;
      // seen from the ground the sky only deepens a little; the full fade to black happens in the haze switch
      zen.copy(SKY.zenithLow).lerp(SKY.zenithHigh, alt * 0.45);
      hor.copy(SKY.horizonLow).lerp(SKY.horizonHigh, Math.pow(alt, 0.8) * 0.35);
      skyMat.uniforms["uStars"]!.value = smooth(0.55, 1, a);
      fog.color.copy(hor);
      fog.near = 40 + alt * 200;
      fog.far = 600 + alt * 1400;
      if (sun.current) {
        sun.current.intensity = 2.6;
        sun.current.position.copy(PAD_SUN).multiplyScalar(30).add(tmpV.set(0, st ? st.position.y : 0, 0));
        sun.current.target.position.set(0, st ? st.position.y : 0, 0);
        sun.current.target.updateMatrixWorld();
      }
      if (hemi.current) hemi.current.intensity = 0.9 - alt * 0.5;
    } else {
      if (sun.current) {
        sun.current.intensity = 3.2;
        sun.current.position.copy(SUN_DIR).multiplyScalar(60);
        sun.current.target.position.set(0, 0, 0);
        sun.current.target.updateMatrixWorld();
      }
      if (hemi.current) hemi.current.intensity = 0.15;
    }

    // --- Camera -------------------------------------------------------------
    const px = state.pointer.x * 0.6;
    const py = state.pointer.y * 0.3;
    const sp = st ? st.position : tmpV.set(0, 0, 0);
    const cam = camera as THREE.PerspectiveCamera;
    let fov = BASE_FOV;
    if (!inSpace) {
      // Long-lens tracking camera on the ground (like broadcast launch footage): it stays put after liftoff,
      // tilts up to follow the stack and zooms in so the vehicle stays a similar size in frame.
      const intro = smooth(0, LIFTOFF_AT, p);
      const dist = 19 - intro * 4;
      const ang = 0.62;
      const rise = smooth(0.08, 1, a) * 9;
      camera.position.set(Math.sin(ang) * dist + px, 2.6 + (1 - intro) * 1.4 + rise + py, Math.cos(ang) * dist);
      const shake = srbThrust.current * (1 - smooth(0, 0.3, a)) * 0.05;
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      lookTarget.set(sp.x, sp.y + 2.8 - smooth(0.02, 0.3, a) * 0.6, 0);
      const d = camera.position.distanceTo(lookTarget);
      const zoomOut = 1 + smooth(0.05, 0.6, a) * 0.7; // leave room for the exhaust column
      fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan((FRAME_HALF * zoomOut) / d)), MIN_FOV, BASE_FOV);
    } else {
      const back = smooth(0.4, 1, b);
      const close = tmpV.set(sp.x + 5.5, sp.y - 0.5, 10);
      const far = tmpV2.set(sp.x + 6, 7, 52);
      camera.position.copy(close).lerp(far, back);
      camera.position.x += px * (1 + back * 3);
      camera.position.y += py * (1 + back * 3);
      lookTarget.set(sp.x, sp.y + 1.5 * (1 - back), 0).lerp(tmpV.set(sp.x * 0.5 - 5, -10, -6), back * 0.55);
    }
    if (launchState.inspect) {
      const [ix, iy, iz] = launchState.inspect;
      camera.position.set(sp.x + ix, sp.y + iy, sp.z + iz);
      lookTarget.set(sp.x, sp.y + 2.4, sp.z);
    }
    camera.lookAt(lookTarget);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <>
      <mesh ref={sky} material={skyMat} renderOrder={-1}>
        <sphereGeometry args={[1800, 48, 32]} />
      </mesh>
      <hemisphereLight ref={hemi} args={["#cfe0ff", "#7a6046", 0.9]} />
      <directionalLight
        ref={sun}
        castShadow
        intensity={2.6}
        color="#fff1dc"
        shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />
      <pointLight ref={engineLight} color="#ff9a3c" distance={40} decay={1.6} intensity={0} />
      <Environment resolution={256}>
        <Lightformer intensity={2.2} position={[0, 6, 4]} scale={[12, 6, 1]} color="#fff4e6" />
        <Lightformer intensity={1.2} position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[16, 3, 1]} color="#9fc0ff" />
        <Lightformer intensity={0.8} position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[16, 3, 1]} color="#ffc89a" />
      </Environment>

      <group ref={ground}>
        <LaunchPad trees={quality.trees} />
        <Smoke emittersRef={emitters} rateRef={smokeRate} count={quality.smokeParticles} />
        <Trail sourceRef={trailSource} activeRef={trailActive} count={quality.trailParticles} />
      </group>

      <group ref={space} visible={false}>
        <Stars radius={300} depth={120} count={5000} factor={5} saturation={0} fade speed={0.4} />
        <Suspense fallback={null}>
          <Earth radius={28} position={[0, -36, -8]} />
        </Suspense>
        <ambientLight intensity={0.08} />
      </group>

      <group ref={stack}>
        <Suspense fallback={null}>
          <ShuttleStack
            tankRef={tank}
            srbLRef={srbL}
            srbRRef={srbR}
            layout={layout}
            srbThrust={srbThrust}
            ssmeThrust={ssmeThrust}
          />
          <ReadyMarker onReady={onReady} />
        </Suspense>
      </group>
    </>
  );
}

function ReadyMarker({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(onReady));
    return () => cancelAnimationFrame(id);
  }, [onReady]);
  return null;
}

export default function LaunchCanvas() {
  const wrapper = useRef<HTMLDivElement>(null);
  const markReady = () => wrapper.current?.setAttribute("data-scene-ready", "true");
  // Phones get the light tier, laptops/desktops the full one; the monitor then adapts resolution to measured FPS.
  const quality = useMemo(() => QUALITY[pickTier(readDeviceHints())], []);
  const deviceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const [dpr, setDpr] = useState(() => Math.min(deviceDpr, quality.maxDpr));
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __launch: typeof launchState }).__launch = launchState;
  }, []);

  return (
    <div ref={wrapper} className="absolute inset-0">
      <Canvas
        shadows="soft"
        dpr={dpr}
        camera={{ fov: 38, near: 0.1, far: 4000, position: [10, 3, 16] }}
        gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr((d) => Math.max(quality.minDpr, +(d * 0.8).toFixed(2)))}
          onIncline={() => setDpr((d) => Math.min(Math.min(deviceDpr, quality.maxDpr), +(d * 1.15).toFixed(2)))}
          flipflops={4}
          onFallback={() => setDpr(quality.minDpr)}
        />
        <color attach="background" args={["#000000"]} />
        <Scene onReady={markReady} quality={quality} />
        <EffectComposer multisampling={quality.msaa} enableNormalPass={false}>
          {/* only HDR highlights (engine plumes, sun glint) cross the threshold */}
          <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.25} intensity={0.85} radius={0.7} />
          <HueSaturation saturation={0.08} />
          <BrightnessContrast contrast={0.06} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.32} darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
