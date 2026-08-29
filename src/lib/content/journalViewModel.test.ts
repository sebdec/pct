import { describe, expect, it } from "vitest";

import { createValidContentModel } from "./contentFixtures.ts";
import {
  buildJournalNavigatorItems,
  buildJournalViewModels,
} from "./journalViewModel.ts";
import { daySchema, journalEntrySchema, photoSchema } from "./schemas.ts";

function createValidJournalSource() {
  const source = createValidContentModel();

  return {
    days: daySchema.array().parse(source.days),
    journalEntries: journalEntrySchema.array().parse(source.journalEntries),
    photos: photoSchema.array().parse(source.photos),
  };
}

describe("journal view models", () => {
  it("assembles published entries, metrics, photos and navigation", () => {
    const source = createValidJournalSource();
    const pages = buildJournalViewModels({
      days: source.days,
      journalEntries: source.journalEntries,
      photos: source.photos,
    });

    expect(pages).toHaveLength(3);
    expect(pages[0]).toMatchObject({
      day: { id: "day-001" },
      regionLabel: "Désert",
      previous: null,
      next: { dayId: "day-002", sequence: 2 },
      metrics: {
        mileStart: 0,
        mileEnd: 10,
        distanceMiles: 10,
        distanceKilometers: 16.09344,
        ascentMeters: 751,
        descentMeters: 684,
      },
    });
    expect(pages[0].photos.map(({ id }) => id)).toEqual(["photo-001001"]);
    expect(pages[2]).toMatchObject({
      day: { id: "day-003", kind: "post-trail" },
      regionLabel: "Après le trail",
      metrics: null,
      next: null,
      previous: { dayId: "day-002", sequence: 2 },
    });

    expect(buildJournalNavigatorItems(pages)).toEqual([
      {
        dayId: "day-001",
        sequence: 1,
        locationLabel: "Campo",
        regionId: "desert",
        regionLabel: "Désert",
        mileStart: 0,
        mileEnd: 10,
      },
      {
        dayId: "day-002",
        sequence: 2,
        locationLabel: "Lake Morena",
        regionId: "sierra",
        regionLabel: "Sierra",
        mileStart: 10,
        mileEnd: 20,
      },
      {
        dayId: "day-003",
        sequence: 3,
        locationLabel: "Vancouver",
        regionId: null,
        regionLabel: "Après le trail",
        mileStart: null,
        mileEnd: null,
      },
    ]);
  });

  it("rejects a published day without localized content", () => {
    const source = createValidJournalSource();

    expect(() =>
      buildJournalViewModels({
        days: source.days,
        journalEntries: source.journalEntries.slice(1),
        photos: source.photos,
      }),
    ).toThrow("Published day day-001 is missing its fr journal entry.");
  });

  it("rejects unknown and cross-day photo references", () => {
    const source = createValidJournalSource();
    const [firstEntry, ...otherEntries] = source.journalEntries;

    expect(() =>
      buildJournalViewModels({
        days: source.days,
        journalEntries: [
          { ...firstEntry, photoIds: ["photo-001999"] },
          ...otherEntries,
        ],
        photos: source.photos,
      }),
    ).toThrow("day-001 references unknown photo photo-001999.");

    expect(() =>
      buildJournalViewModels({
        days: source.days,
        journalEntries: source.journalEntries,
        photos: [{ ...source.photos[0], dayId: "day-002" }],
      }),
    ).toThrow("day-001 references photo-001001, which belongs to day-002.");
  });

  it("rejects duplicate localized entries and photo references", () => {
    const source = createValidJournalSource();

    expect(() =>
      buildJournalViewModels({
        days: source.days,
        journalEntries: [...source.journalEntries, source.journalEntries[0]],
        photos: source.photos,
      }),
    ).toThrow("Duplicate fr journal entry: day-001");

    expect(() =>
      buildJournalViewModels({
        days: source.days,
        journalEntries: source.journalEntries.map((entry) =>
          entry.dayId === "day-001"
            ? { ...entry, photoIds: ["photo-001001", "photo-001001"] }
            : entry,
        ),
        photos: source.photos,
      }),
    ).toThrow("Duplicate day-001 photo reference: photo-001001");
  });
});
