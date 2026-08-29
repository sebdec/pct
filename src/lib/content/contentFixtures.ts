import type { ContentModelSource } from "./validateContent.ts";

const sourceRef = {
  document: "PCT 2026 - Sebdec.docx",
  blockType: "table",
  blockIndex: 1,
} as const;

export function createValidContentModel(): ContentModelSource {
  return {
    regions: [
      {
        id: "desert",
        order: 1,
        trailMarkKey: "cactus",
        published: true,
        sourceRefs: [],
      },
      {
        id: "sierra",
        order: 2,
        trailMarkKey: "mountain",
        published: true,
        sourceRefs: [],
      },
      {
        id: "norcal",
        order: 3,
        trailMarkKey: "bear",
        published: true,
        sourceRefs: [],
      },
      {
        id: "oregon",
        order: 4,
        trailMarkKey: "lake-mosquito",
        published: true,
        sourceRefs: [],
      },
      {
        id: "washington",
        order: 5,
        trailMarkKey: "mountain-goat",
        published: true,
        sourceRefs: [],
      },
    ],
    sections: [
      {
        id: "section-a",
        code: "A",
        regionId: "desert",
        mileStart: 0,
        mileEnd: 15,
        properName: "Campo to Lake Morena",
        published: true,
        sourceRefs: [],
      },
      {
        id: "section-b",
        code: "B",
        regionId: "sierra",
        mileStart: 15,
        mileEnd: 30,
        properName: "Lake Morena to the Sierra",
        published: true,
        sourceRefs: [],
      },
    ],
    days: [
      {
        id: "day-001",
        sequence: 1,
        date: "2026-04-18",
        kind: "trail",
        regionId: "desert",
        sectionIds: ["section-a"],
        mileStart: 0,
        mileEnd: 10,
        ascentMeters: 751,
        descentMeters: 684,
        locationId: "campo",
        published: true,
        sourceRefs: [sourceRef],
      },
      {
        id: "day-002",
        sequence: 2,
        date: "2026-04-19",
        kind: "trail",
        regionId: "sierra",
        sectionIds: ["section-a", "section-b"],
        mileStart: 10,
        mileEnd: 20,
        ascentMeters: 500,
        descentMeters: 200,
        locationId: "lake-morena",
        published: true,
        sourceRefs: [sourceRef],
      },
      {
        id: "day-003",
        sequence: 3,
        date: "2026-07-24",
        kind: "post-trail",
        published: true,
        sourceRefs: [sourceRef],
      },
    ],
    journalEntries: [
      {
        dayId: "day-001",
        locale: "fr",
        title: "Le départ",
        locationLabel: "Campo",
        photoIds: ["photo-0001"],
      },
      {
        dayId: "day-002",
        locale: "fr",
        title: "2 sections",
        locationLabel: "Lake Morena",
        photoIds: [],
      },
      {
        dayId: "day-003",
        locale: "fr",
        title: "Après le terminus",
        locationLabel: "Vancouver",
        photoIds: [],
      },
    ],
    photos: [
      {
        id: "photo-0001",
        dayId: "day-001",
        order: 0,
        assetKey: "pct-2026-day-001-001",
        width: 1600,
        height: 1200,
        published: true,
        sourceRefs: [{ ...sourceRef, blockType: "image" }],
      },
    ],
    localizedPhotos: [
      {
        photoId: "photo-0001",
        locale: "fr",
        alt: "Le monument du terminus sud à Campo",
      },
    ],
    glossaryConcepts: [
      {
        id: "trail-angel",
        published: true,
        sourceRefs: [sourceRef],
      },
    ],
    localizedGlossaryEntries: [
      {
        conceptId: "trail-angel",
        locale: "fr",
        term: "Trail angel",
        definition: "Une personne qui aide les marcheurs sur le parcours.",
        aliases: [],
      },
    ],
    gearItems: [
      {
        id: "gear-shelter-plex-solo",
        categoryId: "shelter",
        brand: "Zpacks",
        model: "Plex Solo",
        weightGrams: 395,
        published: true,
        sourceRefs: [sourceRef],
      },
    ],
    localizedGearEntries: [
      {
        gearItemId: "gear-shelter-plex-solo",
        locale: "fr",
        name: "Tente Plex Solo",
      },
    ],
    supportingPages: [
      {
        pageId: "closing",
        locale: "fr",
        kind: "closing",
        title: "Après le chemin",
        published: true,
      },
    ],
    corrections: [
      {
        id: "correction-0001",
        entityType: "day",
        entityId: "day-001",
        field: "locationId",
        sourceValue: "Camp",
        correctedValue: "Campo",
        reason: "Correction du nom du terminus sud.",
        status: "approved",
        sourceRef,
      },
    ],
  };
}
