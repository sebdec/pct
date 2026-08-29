import { describe, expect, it } from "vitest";

import { homeUrl, journalDayUrl, mapDayUrl, mapUrl } from "./urls.ts";

describe("content URLs", () => {
  it("keeps stable neutral day slugs without locale segments", () => {
    expect(journalDayUrl("day-001")).toBe("/journal/day-001");
  });

  it("creates the default map URL and stable map day URLs", () => {
    expect(mapUrl()).toBe("/map");
    expect(mapDayUrl("day-034")).toBe("/map/day-034");
  });

  it("creates the root home URL and rejects invalid inputs", () => {
    expect(homeUrl()).toBe("/");
    expect(() => journalDayUrl("first-day")).toThrow();
    expect(() => mapDayUrl("first-day")).toThrow();
  });
});
