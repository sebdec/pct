import { describe, expect, it } from "vitest";

import { createValidContentModel } from "./contentFixtures.ts";
import {
  assertContentModel,
  ContentValidationError,
  validateContentModel,
  type ContentModelSource,
} from "./validateContent.ts";

function cloneFixture(): ContentModelSource {
  return structuredClone(createValidContentModel());
}

describe("content model validation", () => {
  it("accepts a representative bilingual-ready model", () => {
    const result = validateContentModel(createValidContentModel());

    expect(result).toEqual({ valid: true, issues: [] });
  });

  it("accepts a day spanning sections and a post-trail day without metrics", () => {
    expect(() => assertContentModel(createValidContentModel())).not.toThrow();
  });

  it("accepts a zero-mile trail entry without creating a gap", () => {
    const fixture = cloneFixture();
    const firstDay = fixture.days[0] as Record<string, unknown>;
    const secondDay = fixture.days[1] as Record<string, unknown>;
    firstDay.mileEnd = 0;
    secondDay.mileStart = 0;

    expect(() => assertContentModel(fixture)).not.toThrow();
  });

  it("reports duplicate identifiers and broken references", () => {
    const fixture = cloneFixture();
    fixture.sections = [...fixture.sections, fixture.sections[0]];
    fixture.journalEntries = [
      ...fixture.journalEntries,
      {
        dayId: "day-999",
        locale: "en",
        title: "Missing day",
        locationLabel: "Unknown",
        photoIds: [],
      },
    ];

    const result = validateContentModel(fixture);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "id.duplicate" }),
        expect.objectContaining({ code: "reference.day" }),
      ]),
    );
  });

  it.each([
    [11, "mileage.gap"],
    [9, "mileage.overlap"],
  ])("reports discontinuity at mile %s", (mileStart, code) => {
    const fixture = cloneFixture();
    const secondDay = fixture.days[1] as Record<string, unknown>;
    secondDay.mileStart = mileStart;

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
  });

  it("reports sequence gaps and identifiers that do not match the sequence", () => {
    const fixture = cloneFixture();
    const secondDay = fixture.days[1] as Record<string, unknown>;
    secondDay.sequence = 4;

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "day.sequence" }),
        expect.objectContaining({ code: "day.id.sequence" }),
      ]),
    );
  });

  it("requires every published locale for neutral content", () => {
    const fixture = cloneFixture();
    fixture.localizedGlossaryEntries = fixture.localizedGlossaryEntries.filter(
      (entry) => (entry as Record<string, unknown>).locale !== "en",
    );

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "translation.en.missing",
          path: "glossaryConcepts.trail-angel",
        }),
      ]),
    );
  });

  it("requires source-language photo copy without requiring English", () => {
    const withoutEnglish = cloneFixture();
    withoutEnglish.localizedPhotos = withoutEnglish.localizedPhotos.filter(
      (entry) => (entry as Record<string, unknown>).locale !== "en",
    );

    expect(validateContentModel(withoutEnglish)).toEqual({
      valid: true,
      issues: [],
    });

    const withoutFrench = cloneFixture();
    withoutFrench.localizedPhotos = withoutFrench.localizedPhotos.filter(
      (entry) => (entry as Record<string, unknown>).locale !== "fr",
    );

    expect(validateContentModel(withoutFrench).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "translation.fr.missing",
          path: "photos.photo-001001",
        }),
      ]),
    );
  });

  it("preserves photo order in journal translations", () => {
    const fixture = cloneFixture();
    const englishEntry = fixture.journalEntries.find(
      (entry) =>
        (entry as Record<string, unknown>).locale === "en" &&
        (entry as Record<string, unknown>).dayId === "day-001",
    ) as Record<string, unknown>;
    englishEntry.photoIds = [];

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "translation.journal.photo-parity",
          path: "journalEntries.en:day-001.photoIds",
        }),
      ]),
    );
  });

  it("requires a complete published media asset for a published photo", () => {
    const fixture = cloneFixture();
    fixture.mediaAssets = [];

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "reference.photo-asset",
          path: "photos.photo-001001.assetKey",
        }),
      ]),
    );
  });

  it("rejects negative elevation data at the schema boundary", () => {
    const fixture = cloneFixture();
    const firstDay = fixture.days[0] as Record<string, unknown>;
    firstDay.ascentMeters = -1;

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "schema.invalid",
          path: "days[0].ascentMeters",
        }),
      ]),
    );
  });

  it("rejects ambiguous equipment ordering", () => {
    const fixture = cloneFixture();
    const item = fixture.gearItems[0] as Record<string, unknown>;
    item.order = 2;

    expect(validateContentModel(fixture).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "gear.order",
          path: "gearItems.gear-shelter-plex-solo.order",
        }),
      ]),
    );
  });

  it("rejects route anchors whose mileage is not strictly ordered", () => {
    const fixture = cloneFixture();
    const route = fixture.routes![0] as Record<string, unknown>;
    route.anchors = [
      { mile: 0, routeProgress: 0 },
      { mile: 100, routeProgress: 0.2 },
      { mile: 100, routeProgress: 0.3 },
      { mile: 2655.84, routeProgress: 1 },
    ];

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "route.anchor.mile-order" }),
      ]),
    );
  });

  it("rejects a trail day outside the journal route domain", () => {
    const fixture = cloneFixture();
    const secondDay = fixture.days[1] as Record<string, unknown>;
    secondDay.mileEnd = 2657;

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "route.day.out-of-range" }),
      ]),
    );
  });

  it("rejects undocumented mileage between the official and journal maxima", () => {
    const fixture = cloneFixture();
    const secondDay = fixture.days[1] as Record<string, unknown>;
    secondDay.mileEnd = 2655.9;

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "route.day.unsupported-clamp" }),
      ]),
    );
  });

  it("allows multiple photo placements to reuse a media asset", () => {
    const fixture = cloneFixture();
    fixture.photos = [
      ...fixture.photos,
      {
        ...(fixture.photos[0] as Record<string, unknown>),
        id: "photo-001002",
      },
    ];
    fixture.journalEntries
      .filter((entry) => (entry as Record<string, unknown>).dayId === "day-001")
      .forEach((entry) => {
        (entry as Record<string, unknown>).photoIds = [
          "photo-001001",
          "photo-001002",
        ];
      });
    fixture.localizedPhotos = [
      ...fixture.localizedPhotos,
      {
        photoId: "photo-001002",
        locale: "fr",
        alt: "Le monument du terminus sud à Campo",
      },
      {
        photoId: "photo-001002",
        locale: "en",
        alt: "The southern terminus monument in Campo",
      },
    ];

    expect(validateContentModel(fixture)).toEqual({ valid: true, issues: [] });
  });

  it("turns diagnostics into an actionable validation error", () => {
    const fixture = cloneFixture();
    const entry = fixture.journalEntries[0] as Record<string, unknown>;
    entry.dayId = "day-999";

    expect(() => assertContentModel(fixture)).toThrow(ContentValidationError);
    expect(() => assertContentModel(fixture)).toThrow(
      '[reference.day] journalEntries.fr:day-999: Unknown day "day-999".',
    );
  });
});
