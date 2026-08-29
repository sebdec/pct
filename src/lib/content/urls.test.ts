import { describe, expect, it } from "vitest";

import { homeUrl, journalDayUrl, mapUrl } from "./urls.ts";

describe("content URLs", () => {
  it("keeps stable neutral day slugs without locale segments", () => {
    expect(journalDayUrl("day-001")).toBe("/journal/day-001");
  });

  it("keeps the map at a single simple URL", () => {
    expect(mapUrl()).toBe("/map");
  });

  it("creates the root home URL and rejects invalid inputs", () => {
    expect(homeUrl()).toBe("/");
    expect(() => journalDayUrl("first-day")).toThrow();
  });
});
