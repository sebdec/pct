import { describe, expect, it } from "vitest";

import { getLocalizedLinks } from "./metadata.ts";

describe("localized metadata", () => {
  it("returns reciprocal links and English as x-default", () => {
    expect(getLocalizedLinks("/fr/journal/day-034", "fr")).toEqual([
      { locale: "en", path: "/journal/day-034" },
      { locale: "fr", path: "/fr/journal/day-034" },
      { locale: "x-default", path: "/journal/day-034" },
    ]);
  });
});
