import type { ContentModelSource } from "./validateContent.ts";

export function createValidContentModel(): ContentModelSource {
  return {
    regions: [
      {
        id: "desert",
        order: 1,
        published: true,
      },
      {
        id: "sierra",
        order: 2,
        published: true,
      },
      {
        id: "norcal",
        order: 3,
        published: true,
      },
      {
        id: "oregon",
        order: 4,
        published: true,
      },
      {
        id: "washington",
        order: 5,
        published: true,
      },
    ],
    sections: [
      {
        id: "section-california-a",
        code: "A",
        regionId: "desert",
        mileStart: 0,
        mileEnd: 15,
        properName: "Campo to Lake Morena",
        published: true,
      },
      {
        id: "section-california-b",
        code: "B",
        regionId: "sierra",
        mileStart: 15,
        mileEnd: 30,
        properName: "Lake Morena to the Sierra",
        published: true,
      },
    ],
    days: [
      {
        id: "day-001",
        sequence: 1,
        date: "2026-04-18",
        kind: "trail",
        regionId: "desert",
        sectionIds: ["section-california-a"],
        mileStart: 0,
        mileEnd: 10,
        ascentMeters: 751,
        descentMeters: 684,
        locationId: "campo",
        published: true,
      },
      {
        id: "day-002",
        sequence: 2,
        date: "2026-04-19",
        kind: "trail",
        regionId: "sierra",
        sectionIds: ["section-california-a", "section-california-b"],
        mileStart: 10,
        mileEnd: 20,
        ascentMeters: 500,
        descentMeters: 200,
        locationId: "lake-morena",
        published: true,
      },
      {
        id: "day-003",
        sequence: 3,
        date: "2026-07-24",
        kind: "post-trail",
        published: true,
      },
    ],
    routes: [
      {
        id: "pct-2026",
        source: {
          name: "Pacific Crest Trail Association",
          revision: "2026",
          centerlineUrl:
            "https://services5.arcgis.com/ZldHa25efPFpMmfB/ArcGIS/rest/services/PCTA_Centerline/FeatureServer/0",
          centerlineLastEdit: "2026-01-06T23:18:04.221Z",
          mileMarkersUrl:
            "https://services5.arcgis.com/ZldHa25efPFpMmfB/ArcGIS/rest/services/PCT_Mile_Markers_2026/FeatureServer/0",
          mileMarkersLastEdit: "2026-01-07T00:14:06.948Z",
          license: "CC BY 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
          attribution:
            "Trail data © Pacific Crest Trail Association, CC BY 4.0, 2026",
        },
        crs: "EPSG:4326",
        officialLengthMiles: 2655.84,
        journalMaxMile: 2656,
        terminalClamp: { fromMile: 2656, toMile: 2655.84 },
        bounds: {
          southwest: [-120.802105, 32.589741],
          northeast: [-116.466981, 49.000302],
        },
        termini: {
          south: [-116.466981, 32.589741],
          north: [-120.802105, 49.000302],
        },
        coordinates: [
          [-116.466981, 32.589741],
          [-120.802105, 49.000302],
        ],
        anchors: [
          { mile: 0, routeProgress: 0 },
          { mile: 100, routeProgress: 0.5 },
          { mile: 2655.84, routeProgress: 1 },
        ],
        normalization: {
          maxAllowableOffsetDegrees: 0.00025,
          coordinatePrecision: 6,
          sourceCoordinateCount: 2,
          sourceMarkerCount: 2,
          validMarkerCount: 1,
          excludedMarkerCount: 1,
          maxAnchorProjectionMeters: 0,
        },
      },
    ],
    journalEntries: [
      {
        dayId: "day-001",
        locale: "fr",
        title: "Le départ",
        locationLabel: "Campo",
        photoIds: ["photo-001001"],
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
      {
        dayId: "day-001",
        locale: "en",
        title: "The start",
        locationLabel: "Campo",
        photoIds: ["photo-001001"],
      },
      {
        dayId: "day-002",
        locale: "en",
        title: "2 sections",
        locationLabel: "Lake Morena",
        photoIds: [],
      },
      {
        dayId: "day-003",
        locale: "en",
        title: "After the terminus",
        locationLabel: "Vancouver",
        photoIds: [],
      },
    ],
    photos: [
      {
        id: "photo-001001",
        dayId: "day-001",
        assetKey: "pct-2026-day-001-001",
        width: 1600,
        height: 1200,
        published: true,
      },
    ],
    mediaAssets: [
      {
        id: "media-0123456789abcdef",
        assetKey: "pct-2026-day-001-001",
        sourceFingerprint:
          "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        width: 1600,
        height: 1200,
        placeholder: {
          dataUrl: "data:image/webp;base64,AA==",
          width: 24,
          height: 18,
        },
        variants: [
          {
            format: "avif",
            width: 640,
            height: 480,
            bytes: 100,
            path: "pct-2026/pct-2026-day-001-001/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef-640.avif",
            url: "https://example.com/photo-640.avif",
          },
          {
            format: "webp",
            width: 640,
            height: 480,
            bytes: 120,
            path: "pct-2026/pct-2026-day-001-001/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef-640.webp",
            url: "https://example.com/photo-640.webp",
          },
          {
            format: "avif",
            width: 960,
            height: 720,
            bytes: 180,
            path: "pct-2026/pct-2026-day-001-001/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef-960.avif",
            url: "https://example.com/photo-960.avif",
          },
          {
            format: "webp",
            width: 960,
            height: 720,
            bytes: 220,
            path: "pct-2026/pct-2026-day-001-001/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef-960.webp",
            url: "https://example.com/photo-960.webp",
          },
          {
            format: "avif",
            width: 1440,
            height: 1080,
            bytes: 300,
            path: "pct-2026/pct-2026-day-001-001/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef-1440.avif",
            url: "https://example.com/photo-1440.avif",
          },
          {
            format: "webp",
            width: 1440,
            height: 1080,
            bytes: 350,
            path: "pct-2026/pct-2026-day-001-001/0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef-1440.webp",
            url: "https://example.com/photo-1440.webp",
          },
        ],
        published: true,
      },
    ],
    localizedPhotos: [
      {
        photoId: "photo-001001",
        locale: "fr",
        alt: "Le monument du terminus sud à Campo",
      },
      {
        photoId: "photo-001001",
        locale: "en",
        alt: "The southern terminus monument in Campo",
      },
    ],
    glossaryConcepts: [
      {
        id: "trail-angel",
        published: true,
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
      {
        conceptId: "trail-angel",
        locale: "en",
        term: "Trail angel",
        definition: "Someone who helps hikers along the trail.",
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
        order: 1,
        published: true,
      },
    ],
    localizedGearEntries: [
      {
        gearItemId: "gear-shelter-plex-solo",
        locale: "fr",
        name: "Tente Plex Solo",
      },
      {
        gearItemId: "gear-shelter-plex-solo",
        locale: "en",
        name: "Plex Solo tent",
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
      {
        pageId: "closing",
        locale: "en",
        kind: "closing",
        title: "After the trail",
        published: true,
      },
    ],
  };
}
