import { describe, expect, it } from "vitest";

import { getProgressStop } from "./presentation.ts";

describe("trail presentation", () => {
  it("aligns progress with the center of the hiker thumb", () => {
    expect(getProgressStop(0, 0, 100)).toBe("calc(0% + 0.75rem)");
    expect(getProgressStop(50, 0, 100)).toBe("calc(50% + 0rem)");
    expect(getProgressStop(100, 0, 100)).toBe("calc(100% - 0.75rem)");
  });

  it("clamps progress outside the configured range", () => {
    expect(getProgressStop(-10, 0, 100)).toBe("calc(0% + 0.75rem)");
    expect(getProgressStop(110, 0, 100)).toBe("calc(100% - 0.75rem)");
  });
});
