import { describe, expect, it } from "vitest";

import { activeStage, altitudeKm, formatClock, missionClock, stages } from "./timeline";

describe("launch timeline", () => {
  it("counts down from T-10 at the top of the page", () => {
    expect(formatClock(missionClock(0))).toBe("T−00:10");
  });
  it("is on the pad before liftoff and reaches orbit at the end", () => {
    expect(altitudeKm(0.05)).toBe(0);
    expect(Math.round(altitudeKm(1))).toBe(400);
  });
  it("ends on the Orbit stage", () => {
    expect(stages[activeStage(1)]?.label).toBe("Orbit");
  });
});
