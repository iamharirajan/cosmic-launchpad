// Pure launch timeline: maps scroll progress (0..1) to mission state.
// No React or three.js imports so it can be reused by the scene and the HUD.

export const PHASE_SWITCH = 0.46;
export const IGNITION_AT = 0.07;
export const LIFTOFF_AT = 0.11;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** 0..1 ascent progress within the atmospheric phase. */
export const ascent = (p: number) => clamp01((p - LIFTOFF_AT) / (PHASE_SWITCH - LIFTOFF_AT));
/** 0..1 progress within the orbital phase. */
export const orbital = (p: number) => clamp01((p - PHASE_SWITCH) / (1 - PHASE_SWITCH));

export const stages = [
  { at: 0, label: "Pre-launch" },
  { at: IGNITION_AT, label: "Ignition" },
  { at: LIFTOFF_AT, label: "Liftoff" },
  { at: 0.3, label: "Max Q" },
  { at: 0.5, label: "SRB Sep" },
  { at: 0.72, label: "MECO · ET Sep" },
  { at: 0.88, label: "Orbit" },
] as const;

export function activeStage(p: number) {
  let idx = 0;
  stages.forEach((s, i) => {
    if (p >= s.at) idx = i;
  });
  return idx;
}

/** Mission clock in seconds: negative before liftoff. */
export function missionClock(p: number) {
  if (p < LIFTOFF_AT) return -10 + (p / LIFTOFF_AT) * 10;
  return ((p - LIFTOFF_AT) / (1 - LIFTOFF_AT)) * 520;
}

export function altitudeKm(p: number) {
  if (p < LIFTOFF_AT) return 0;
  const t = (p - LIFTOFF_AT) / (1 - LIFTOFF_AT);
  return 400 * Math.pow(t, 1.35);
}

export function velocityKmh(p: number) {
  if (p < LIFTOFF_AT) return 0;
  const t = (p - LIFTOFF_AT) / (1 - LIFTOFF_AT);
  return 28000 * Math.pow(t, 1.15);
}

export function formatClock(seconds: number) {
  const sign = seconds < 0 ? "T−" : "T+";
  const s = Math.abs(Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${sign}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/** Opacity for a caption visible between a and b with soft edges. */
export function windowOpacity(p: number, a: number, b: number, edge = 0.02) {
  return smooth(a, a + edge, p) * (1 - smooth(b - edge, b, p));
}

/** Shared mutable store written by scroll, read in the render loop. */
export const launchState: {
  progress: number;
  snap: boolean;
  /** Dev-only: camera offset from the stack for inspecting the model. */
  inspect: [number, number, number] | null;
} = { progress: 0, snap: false, inspect: null };
