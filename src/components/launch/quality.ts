// Device quality tiers for the launch scene. Pure module (no React / three.js) so it can be unit-tested.

export type Tier = "low" | "high";

export type DeviceHints = {
  /** Touch-first device (phones, most tablets). */
  coarsePointer: boolean;
  /** Smallest screen side in CSS px. */
  minScreenSide: number;
  /** navigator.hardwareConcurrency (0 when unknown). */
  cores: number;
  /** navigator.deviceMemory in GB (0 when unknown). */
  memoryGb: number;
};

export type QualitySettings = {
  /** Max device pixel ratio the canvas renders at. */
  maxDpr: number;
  /** Lowest DPR the adaptive monitor may step down to. */
  minDpr: number;
  shadowMapSize: number;
  smokeParticles: number;
  trees: number;
  /** Post-processing MSAA samples (0 = off). */
  msaa: number;
  oceanSegments: number;
};

export const QUALITY: Record<Tier, QualitySettings> = {
  low: { maxDpr: 1.5, minDpr: 0.75, shadowMapSize: 1024, smokeParticles: 2000, trees: 320, msaa: 0, oceanSegments: 1 },
  high: { maxDpr: 2, minDpr: 1, shadowMapSize: 2048, smokeParticles: 4200, trees: 900, msaa: 4, oceanSegments: 1 },
};

/** Phones and weak machines get the light tier; laptops and desktops the full one. */
export function pickTier(h: DeviceHints): Tier {
  const phoneSized = h.coarsePointer && h.minScreenSide < 820;
  const weakCpu = h.cores > 0 && h.cores <= 4;
  const lowMemory = h.memoryGb > 0 && h.memoryGb <= 4;
  if (phoneSized) return "low";
  if (weakCpu && lowMemory) return "low";
  return "high";
}

export function readDeviceHints(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    minScreenSide: Math.min(window.screen?.width ?? window.innerWidth, window.screen?.height ?? window.innerHeight),
    cores: nav.hardwareConcurrency ?? 0,
    memoryGb: nav.deviceMemory ?? 0,
  };
}
