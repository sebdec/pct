import { describe, expect, it } from "vitest";

import { getSiteNavigation } from "./site";

describe("site foundation", () => {
  it("keeps navigation targets unique and local", () => {
    const navigation = getSiteNavigation("en");
    const targets = navigation.map(({ href }) => href);

    expect(new Set(targets).size).toBe(targets.length);
    expect(
      targets.every(
        (target) => target.startsWith("/") && !target.startsWith("//"),
      ),
    ).toBe(true);
    expect(targets).toContain("/");
    expect(targets).toContain("/journal/day-001");
    expect(targets).toContain("/map");
    expect(navigation.map(({ label }) => label)).not.toContain("Explore");
  });

  it("prefixes French navigation without changing page identity", () => {
    const targets = getSiteNavigation("fr").map(({ href }) => href);

    expect(targets).toEqual([
      "/fr",
      "/fr/journal/day-001",
      "/fr/map",
      "/fr/gear",
      "/fr/glossary",
    ]);
  });
});
