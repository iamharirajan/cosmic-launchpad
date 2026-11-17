import * as THREE from "three";

// Procedural paint for the shuttle GLB (it ships without textures).
// All rules run in the model's own coordinate space: x = span (+x right wing),
// y = up (top of orbiter, belly -y), z = nose (-z) to tail (+z).

export type PartKind = "orbiter" | "tank" | "booster" | "engine" | "glass";

const COMMON = /* glsl */ `
  varying vec3 vMP;
  varying vec3 vMN;
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float vnoise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float band(float v, float c, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.04, abs(v - c)); }
  vec4 decal(sampler2D tex, vec2 uv) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
    return texture2D(tex, uv);
  }
`;

const ORBITER = /* glsl */ `
  vec3 p = vMP; vec3 n = normalize(vMN);
  float wing = step(2.4, abs(p.x)) * step(p.y, 0.95) * step(3.0, p.z);
  float belly = smoothstep(-0.12, -0.38, n.y);
  float lowSide = smoothstep(0.85, 0.5, p.y) * smoothstep(0.3, 0.6, abs(n.x)) * (1.0 - wing);
  float nose = smoothstep(1.25, 0.75, p.z);
  float cockpit = smoothstep(3.15, 2.85, p.z) * smoothstep(2.05, 2.3, p.y);
  float leading = wing * smoothstep(-0.2, -0.55, n.z);
  float tailEdge = step(abs(p.x), 0.35) * step(3.6, p.y) * smoothstep(-0.3, -0.6, n.z);
  float black = clamp(max(max(belly, lowSide), max(max(nose, cockpit), max(leading, tailEdge))), 0.0, 1.0);

  // HRSI black tiles: small grid with per-tile tone variation.
  vec2 tc = abs(n.y) > 0.6 ? p.xz : (abs(n.x) > abs(n.z) ? p.zy : p.xy);
  vec2 tf = abs(fract(tc / 0.16) - 0.5);
  float grout = smoothstep(0.43, 0.49, max(tf.x, tf.y));
  vec3 tile = vec3(0.022 + 0.025 * hash2(floor(tc / 0.16)));
  tile = mix(tile, vec3(0.11, 0.105, 0.1), grout * 0.55);

  // Upper white blankets: quilted, slightly off-white patches.
  vec2 bf = abs(fract(tc / 0.5) - 0.5);
  float quilt = smoothstep(0.4, 0.5, max(bf.x, bf.y));
  float patchTone = hash2(floor(tc / 0.5) + 7.0);
  vec3 blanket = vec3(0.86, 0.85, 0.82) * (0.93 + 0.07 * patchTone) * (1.0 - 0.06 * quilt);
  // Payload bay door hinge lines and centre seam.
  float seam = step(2.6, p.y) * (band(abs(p.x), 0.0, 0.03) + band(abs(p.x), 1.75, 0.03)) * step(4.0, p.z) * step(p.z, 20.0);
  blanket *= 1.0 - 0.35 * clamp(seam, 0.0, 1.0);

  vec3 col = mix(blanket, tile, black);
  float rough = mix(0.72, 0.9, black);

  // Markings: flag + "United States" on both fuselage sides, NASA insignia on the right wing.
  if (n.x > 0.45) {
    vec4 d = decal(uSide, vec2((uSideZ.y - p.z) / (uSideZ.y - uSideZ.x), (p.y - uSideY.x) / (uSideY.y - uSideY.x)));
    col = mix(col, d.rgb, d.a);
  } else if (n.x < -0.45) {
    vec4 d = decal(uSide, vec2((p.z - uSideZ.x) / (uSideZ.y - uSideZ.x), (p.y - uSideY.x) / (uSideY.y - uSideY.x)));
    col = mix(col, d.rgb, d.a);
  }
  if (n.y > 0.45 && p.x > 0.0) {
    vec4 d = decal(uWing, vec2((p.x - uWingX.x) / (uWingX.y - uWingX.x), (uWingZ.y - p.z) / (uWingZ.y - uWingZ.x)));
    col = mix(col, d.rgb, d.a);
  }
  diffuseColor.rgb = col;
`;

const TANK = /* glsl */ `
  vec3 p = vMP;
  float big = vnoise(p * vec3(0.9, 0.9, 0.18));
  float fine = vnoise(p * 7.0);
  float streak = vnoise(vec3(atan(p.y + 3.3, p.x) * 6.0, p.z * 0.08, 1.0));
  // late-program ET: burnt, brownish orange foam with darker vertical weathering
  vec3 col = mix(vec3(0.42, 0.13, 0.022), vec3(0.56, 0.19, 0.04), big);
  col *= 0.86 + 0.14 * fine;
  col *= 0.92 + 0.08 * streak;
  // Intertank: ribbed, slightly darker band.
  float inter = smoothstep(-0.3, 0.0, p.z) * (1.0 - smoothstep(5.2, 5.5, p.z));
  float ribs = smoothstep(0.25, 0.45, abs(fract(atan(p.y + 3.3, p.x) * 18.0 / 3.14159) - 0.5));
  col = mix(col, col * (0.72 + 0.18 * ribs), inter);
  // Weld lines on the LH2 tank.
  col *= 1.0 - 0.12 * (band(p.z, 9.0, 0.08) + band(p.z, 14.0, 0.08) + band(p.z, 19.0, 0.08));
  diffuseColor.rgb = col;
  float rough = 0.88;
`;

const BOOSTER = /* glsl */ `
  vec3 p = vMP;
  vec3 col = vec3(0.84, 0.83, 0.8) * (0.95 + 0.05 * vnoise(p * 3.0));
  float joints = band(p.z, -0.6, 0.35) + band(p.z, 6.0, 0.3) + band(p.z, 11.6, 0.3) + band(p.z, 17.2, 0.3) + band(p.z, 22.8, 0.3);
  col = mix(col, vec3(0.42, 0.42, 0.42), clamp(joints, 0.0, 1.0));
  // Forward skirt black marks and aft skirt.
  col = mix(col, vec3(0.04), band(p.z, -2.6, 0.5) * step(0.0, p.x * sign(p.x)));
  col = mix(col, vec3(0.6, 0.6, 0.6), smoothstep(25.6, 26.0, p.z));
  col = mix(col, vec3(0.07, 0.07, 0.075), smoothstep(27.9, 28.2, p.z));
  diffuseColor.rgb = col;
  float rough = mix(0.55, 0.35, smoothstep(27.9, 28.2, p.z));
`;

function makeLabelTextures() {
  // Side: US flag + "United States"
  const side = document.createElement("canvas");
  side.width = 1024;
  side.height = 256;
  const g = side.getContext("2d")!;
  const fx = 30, fy = 60, fw = 230, fh = 128;
  for (let i = 0; i < 13; i++) {
    g.fillStyle = i % 2 ? "#ffffff" : "#b22234";
    g.fillRect(fx, fy + (i * fh) / 13, fw, fh / 13 + 0.5);
  }
  g.fillStyle = "#3c3b6e";
  g.fillRect(fx, fy, fw * 0.4, (fh * 7) / 13);
  g.fillStyle = "#ffffff";
  for (let r = 0; r < 5; r++)
    for (let c = 0; c < 6; c++) g.fillRect(fx + 6 + c * 15, fy + 6 + r * 13, 4, 4);
  g.fillStyle = "#111111";
  g.font = "bold 92px 'Times New Roman', Georgia, serif";
  g.textBaseline = "middle";
  g.fillText("United States", 290, 128);

  // Wing: NASA insignia ("meatball")
  const wing = document.createElement("canvas");
  wing.width = wing.height = 512;
  const w = wing.getContext("2d")!;
  w.fillStyle = "#0b3d91";
  w.beginPath();
  w.arc(256, 256, 240, 0, Math.PI * 2);
  w.fill();
  w.fillStyle = "#ffffff";
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 210;
    w.fillRect(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 3, 3);
  }
  w.strokeStyle = "#ffffff";
  w.lineWidth = 6;
  w.beginPath();
  w.ellipse(256, 270, 200, 70, -0.35, 0, Math.PI * 2);
  w.stroke();
  w.fillStyle = "#fc3d21";
  w.beginPath();
  w.moveTo(60, 380);
  w.quadraticCurveTo(250, 250, 470, 150);
  w.lineTo(330, 260);
  w.quadraticCurveTo(220, 330, 60, 380);
  w.fill();
  w.fillStyle = "#ffffff";
  w.font = "bold 120px Helvetica, Arial, sans-serif";
  w.textAlign = "center";
  w.textBaseline = "middle";
  w.fillText("NASA", 256, 268);

  const toTex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  return { side: toTex(side), wing: toTex(wing) };
}

/** Marking placement (model units). Tuned against the GLB's bounding boxes. */
export const MARKINGS = {
  sideZ: new THREE.Vector2(4.6, 10.0),
  sideY: new THREE.Vector2(1.55, 2.9),
  wingX: new THREE.Vector2(3.5, 5.5),
  wingZ: new THREE.Vector2(17.2, 19.2),
};

export function createPartMaterial(kind: PartKind): THREE.Material {
  if (kind === "engine")
    return new THREE.MeshStandardMaterial({ color: "#9a948c", metalness: 0.9, roughness: 0.32, envMapIntensity: 1.3 });
  if (kind === "glass")
    return new THREE.MeshStandardMaterial({ color: "#050608", metalness: 0.4, roughness: 0.06, envMapIntensity: 2 });

  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8, metalness: 0, envMapIntensity: 1 });
  const body = kind === "orbiter" ? ORBITER : kind === "tank" ? TANK : BOOSTER;
  const labels = kind === "orbiter" ? makeLabelTextures() : null;
  mat.onBeforeCompile = (shader) => {
    if (labels) {
      shader.uniforms["uSide"] = { value: labels.side };
      shader.uniforms["uWing"] = { value: labels.wing };
      shader.uniforms["uSideZ"] = { value: MARKINGS.sideZ };
      shader.uniforms["uSideY"] = { value: MARKINGS.sideY };
      shader.uniforms["uWingX"] = { value: MARKINGS.wingX };
      shader.uniforms["uWingZ"] = { value: MARKINGS.wingZ };
    }
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMP;\nvarying vec3 vMN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMP = position;\nvMN = normal;");
    const uniforms = labels
      ? "uniform sampler2D uSide; uniform sampler2D uWing; uniform vec2 uSideZ; uniform vec2 uSideY; uniform vec2 uWingX; uniform vec2 uWingZ;\n"
      : "";
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${uniforms}${COMMON}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${body}`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = rough;");
  };
  mat.customProgramCacheKey = () => `shuttle-${kind}`;
  return mat;
}
