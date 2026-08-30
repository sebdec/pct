import { describe, expect, it } from "vitest";

import { daySchema } from "../content/schemas.ts";
import { createValidContentModel } from "../content/contentFixtures.ts";
import { buildLocalizedSitemapEntries } from "./sitemap.ts";

describe("localized sitemap", () => {
  it("pairs every public English route with its French equivalent", () => {
    const source = createValidContentModel();
    const entries = buildLocalizedSitemapEntries(
      daySchema.array().parse(source.days),
    );

    expect(entries).toContainEqual({ en: "/", fr: "/fr" });
    expect(entries).toContainEqual({ en: "/map", fr: "/fr/map" });
    expect(entries).toContainEqual({
      en: "/journal/day-003",
      fr: "/fr/journal/day-003",
    });
    expect(entries).not.toContainEqual({
      en: "/map/day-003",
      fr: "/fr/map/day-003",
    });
  });
});
