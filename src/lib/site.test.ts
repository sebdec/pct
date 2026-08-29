import { describe, expect, it } from "vitest";

import { sectionNames, site } from "./site";

describe("site foundation", () => {
  it("keeps navigation targets unique and local", () => {
    const targets = site.navigation.map(({ href }) => href);

    expect(new Set(targets).size).toBe(targets.length);
    expect(
      targets.every(
        (target) => target.startsWith("/") && !target.startsWith("//"),
      ),
    ).toBe(true);
    expect(targets).toContain("/journal/day-001");
  });

  it("models the five editorial trail sections", () => {
    expect(sectionNames).toHaveLength(5);
    expect(sectionNames.at(0)).toBe("Désert");
    expect(sectionNames.at(-1)).toBe("Washington");
  });
});
