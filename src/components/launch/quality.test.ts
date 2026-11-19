import { describe, expect, it } from "vitest";

import { QUALITY, QUALITY_MODE, pickTier, selectTier } from "./quality";

describe("launch scene quality tier", () => {
  it("gives phones the light tier", () => {
    expect(pickTier({ coarsePointer: true, minScreenSide: 390, cores: 8, memoryGb: 8 })).toBe("low");
  });

  it("gives laptops and desktops the full tier", () => {
    expect(pickTier({ coarsePointer: false, minScreenSide: 900, cores: 8, memoryGb: 8 })).toBe("high");
  });

  it("drops weak machines (≤4 cores and ≤4 GB) to the light tier", () => {
    expect(pickTier({ coarsePointer: false, minScreenSide: 768, cores: 4, memoryGb: 4 })).toBe("low");
  });

  it("keeps the light tier within the phone budget", () => {
    expect(QUALITY.low.maxDpr).toBeLessThanOrEqual(1.5);
    expect(QUALITY.low.shadowMapSize).toBeLessThanOrEqual(1024);
  });

  it("uses full detail on every device, phones included", () => {
    expect(QUALITY_MODE).toBe("high");
    expect(selectTier(QUALITY_MODE, { coarsePointer: true, minScreenSide: 390, cores: 4, memoryGb: 2 })).toBe("high");
  });
});
