import { describe, expect, it } from "vitest";

import {
  glossaryEntryUrl,
  glossaryUrl,
  homeUrl,
  journalDayUrl,
  mapDayUrl,
  mapUrl,
  switchLocaleUrl,
} from "./urls.ts";

describe("content URLs", () => {
  it("keeps English day slugs unprefixed and prefixes French routes", () => {
    expect(journalDayUrl("day-001")).toBe("/journal/day-001");
    expect(journalDayUrl("day-001", "fr")).toBe("/fr/journal/day-001");
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

  it("creates stable glossary URLs for explicit journal references", () => {
    expect(glossaryUrl()).toBe("/glossary");
    expect(glossaryEntryUrl("trail-angel")).toBe("/glossary#trail-angel");
    expect(() => glossaryEntryUrl("Trail angel")).toThrow();
  });

  it("switches locale while preserving the exact page and anchor", () => {
    expect(switchLocaleUrl("/journal/day-034", "fr")).toBe(
      "/fr/journal/day-034",
    );
    expect(switchLocaleUrl("/fr/map/day-034", "en")).toBe("/map/day-034");
  });
});
