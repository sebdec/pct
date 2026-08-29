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

  it("requires French copy for published neutral content", () => {
    const fixture = cloneFixture();
    fixture.localizedGlossaryEntries = [];

    const result = validateContentModel(fixture);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "translation.fr.missing",
          path: "glossaryConcepts.trail-angel",
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

  it("turns diagnostics into an actionable validation error", () => {
    const fixture = cloneFixture();
    fixture.corrections = [
      {
        ...(fixture.corrections[0] as Record<string, unknown>),
        entityId: "unknown-entry",
      },
    ];

    expect(() => assertContentModel(fixture)).toThrow(ContentValidationError);
    expect(() => assertContentModel(fixture)).toThrow(
      '[reference.correction] corrections.correction-0001.entityId: Unknown day correction target "unknown-entry".',
    );
  });
});
