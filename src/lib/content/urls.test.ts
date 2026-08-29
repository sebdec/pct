import { describe, expect, it } from "vitest";

import { exploreMileUrl, homeUrl, journalDayUrl } from "./urls.ts";

describe("localized content URLs", () => {
  it("keeps stable neutral day slugs across locales", () => {
    expect(journalDayUrl("fr", "day-001")).toBe("/fr/journal/day-001");
    expect(journalDayUrl("en", "day-001")).toBe("/en/journal/day-001");
  });

  it("creates deterministic shareable mile URLs", () => {
    expect(exploreMileUrl("fr", 150)).toBe("/fr/explore?mile=150");
    expect(exploreMileUrl("en", 150.1254)).toBe("/en/explore?mile=150.125");
  });

  it("creates localized home URLs and rejects invalid inputs", () => {
    expect(homeUrl("fr")).toBe("/fr");
    expect(() => journalDayUrl("fr", "first-day")).toThrow();
    expect(() => exploreMileUrl("fr", -1)).toThrow(RangeError);
  });
});
