import { describe, expect, it } from "vitest";

import { exploreMileUrl, homeUrl, journalDayUrl } from "./urls.ts";

describe("content URLs", () => {
  it("keeps stable neutral day slugs without locale segments", () => {
    expect(journalDayUrl("day-001")).toBe("/journal/day-001");
  });

  it("creates deterministic shareable mile URLs", () => {
    expect(exploreMileUrl(150)).toBe("/explore?mile=150");
    expect(exploreMileUrl(150.1254)).toBe("/explore?mile=150.125");
  });

  it("creates the root home URL and rejects invalid inputs", () => {
    expect(homeUrl()).toBe("/");
    expect(() => journalDayUrl("first-day")).toThrow();
    expect(() => exploreMileUrl(-1)).toThrow(RangeError);
  });
});
