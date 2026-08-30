import { describe, expect, it } from "vitest";

import {
  formatDistance,
  formatDistanceRange,
  formatElevation,
  formatWeight,
  getDefaultDisplayPreferences,
  parseDisplayPreferences,
} from "./displayPreferences.ts";

describe("display preferences", () => {
  it("uses US units only for a US browser locale", () => {
    expect(getDefaultDisplayPreferences("en-US")).toMatchObject({
      distanceUnit: "mi",
      weightUnit: "oz",
    });
    expect(getDefaultDisplayPreferences("fr-FR")).toMatchObject({
      distanceUnit: "km",
      weightUnit: "g",
    });
    expect(getDefaultDisplayPreferences("en-GB")).toMatchObject({
      distanceUnit: "km",
      weightUnit: "g",
    });
  });

  it("falls back safely for malformed or obsolete storage", () => {
    expect(parseDisplayPreferences("not-json", "fr-FR")).toEqual(
      getDefaultDisplayPreferences("fr-FR"),
    );
    expect(
      parseDisplayPreferences(JSON.stringify({ version: 2 }), "en-US"),
    ).toEqual(getDefaultDisplayPreferences("en-US"));
  });

  it("formats canonical miles and grams in the selected units", () => {
    expect(formatDistance(10, "mi")).toBe("10 mi");
    expect(formatDistance(10, "km")).toBe("16,1 km");
    expect(formatDistanceRange(10, 20, "km")).toBe("16,1 → 32,2 km");
    expect(formatElevation(751, "km")).toBe("751 m");
    expect(formatElevation(751, "mi")).toBe("2 464 ft");
    expect(formatWeight(1_000, "g")).toBe("1 000 g");
    expect(formatWeight(1_000, "oz")).toBe("35,3 oz");
  });
});
