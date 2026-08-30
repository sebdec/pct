import { describe, expect, it } from "vitest";

import { buildStructuredData } from "./structuredData.ts";

describe("structured data", () => {
  it("describes a localized public web page", () => {
    const data = buildStructuredData({
      canonicalUrl: "https://pct.sebdec.com/fr/gear",
      title: "Équipement | Pacific Crest Trail 2026",
      description: "Le matériel du parcours.",
      locale: "fr",
    });

    expect(data["@context"]).toBe("https://schema.org");
    expect(data["@graph"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ "@type": "WebSite" }),
        expect.objectContaining({
          "@type": "WebPage",
          inLanguage: "fr",
        }),
      ]),
    );
  });

  it("adds journal article data without replacing the web page", () => {
    const data = buildStructuredData({
      canonicalUrl: "https://pct.sebdec.com/journal/day-001",
      title: "Day 1 Campo | Pacific Crest Trail 2026",
      description: "The first day.",
      locale: "en",
      journal: { headline: "Day 1 Campo", datePublished: "2026-04-18" },
    });

    expect(data["@graph"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ "@type": "WebPage" }),
        expect.objectContaining({
          "@type": "BlogPosting",
          datePublished: "2026-04-18",
          inLanguage: "en",
        }),
      ]),
    );
  });
});
