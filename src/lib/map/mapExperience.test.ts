import { describe, expect, it } from "vitest";

import { createValidContentModel } from "../content/contentFixtures.ts";
import {
  daySchema,
  journalEntrySchema,
  sectionSchema,
} from "../content/schemas.ts";
import {
  buildMapDayViewModels,
  getMapDayForMile,
  initialMapSelection,
  selectMapDay,
  selectMapMile,
} from "./mapExperience.ts";

function fixtureDays() {
  const source = createValidContentModel();

  return buildMapDayViewModels({
    days: daySchema.array().parse(source.days),
    journalEntries: journalEntrySchema.array().parse(source.journalEntries),
    sections: sectionSchema.array().parse(source.sections),
    locale: "fr",
  });
}

describe("map experience", () => {
  it("builds published trail-only day summaries without journal prose", () => {
    const days = fixtureDays();

    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({
      id: "day-001",
      locationLabel: "Campo",
      distanceMiles: 10,
      cumulativeMiles: 10,
      sections: [{ code: "A", properName: "Campo to Lake Morena" }],
      journalHref: "/fr/journal/day-001",
    });
    expect(days.some(({ id }) => id === "day-003")).toBe(false);
  });

  it("starts at the first day and first mile", () => {
    const days = fixtureDays();

    expect(initialMapSelection(days)).toEqual({
      dayId: "day-001",
      mile: 0,
    });
  });

  it("starts a day deep link at the final mile of that day", () => {
    const days = fixtureDays();

    expect(initialMapSelection(days, "day-002")).toEqual({
      dayId: "day-002",
      mile: 20,
    });
  });

  it("uses the day just completed at a shared mile boundary", () => {
    const days = fixtureDays();

    expect(getMapDayForMile(days, 10).id).toBe("day-001");
    expect(selectMapMile(days, 10.1)).toEqual({
      dayId: "day-002",
      mile: 10.1,
    });
  });

  it("preserves an explicitly selected zero-distance day", () => {
    const days = fixtureDays();
    const zeroDay = {
      ...days[1]!,
      id: "day-028",
      sequence: 28,
      mileStart: 703,
      mileEnd: 703,
    };

    expect(selectMapDay([...days, zeroDay], "day-028")).toEqual({
      dayId: "day-028",
      mile: 703,
    });
  });

  it("bounds invalid local selections without URL state", () => {
    const days = fixtureDays();

    expect(selectMapMile(days, -10)).toEqual({
      dayId: "day-001",
      mile: 0,
    });
    expect(selectMapMile(days, Number.NaN)).toEqual({
      dayId: "day-001",
      mile: 0,
    });
    expect(selectMapDay(days, "unknown")).toEqual({
      dayId: "day-001",
      mile: 10,
    });
  });
});
