import { describe, expect, it } from "vitest";

import { createValidContentModel } from "./contentFixtures.ts";
import {
  getCumulativeTrailMiles,
  getTrailDayDistanceKilometers,
  getTrailDayDistanceMiles,
  kilometersPerMile,
  milesToKilometers,
} from "./metrics.ts";
import { trailDaySchema } from "./schemas.ts";

describe("trail distance metrics", () => {
  const trailDays = createValidContentModel()
    .days.map((day) => trailDaySchema.safeParse(day))
    .filter((result) => result.success)
    .map(({ data }) => data);

  it("derives daily and cumulative distances from canonical mile bounds", () => {
    expect(getTrailDayDistanceMiles(trailDays[0])).toBe(10);
    expect(getCumulativeTrailMiles(trailDays)).toBe(20);
    expect(getCumulativeTrailMiles(trailDays, 1)).toBe(10);
  });

  it("derives kilometers without storing a second source of truth", () => {
    expect(milesToKilometers(1)).toBe(kilometersPerMile);
    expect(getTrailDayDistanceKilometers(trailDays[0])).toBe(
      10 * kilometersPerMile,
    );
  });

  it("rejects invalid source values", () => {
    expect(() => milesToKilometers(-1)).toThrow(RangeError);
    expect(() => milesToKilometers(Number.NaN)).toThrow(RangeError);
  });
});
