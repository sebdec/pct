import { z } from "astro/zod";

import { localeSchema } from "./locales.ts";

const stableIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dayIdPattern = /^day-\d{3}$/;
const photoIdPattern = /^photo-(?:\d{6}|[a-z0-9]+(?:-[a-z0-9]+)*-\d{3})$/;

function isIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
  );
}

export const stableIdSchema = z
  .string()
  .min(1)
  .regex(stableIdPattern, "Use a lowercase kebab-case identifier.");

export const correctionFieldSchema = z
  .string()
  .regex(
    /^[a-z][a-zA-Z0-9]*(?:\.[a-z][a-zA-Z0-9]*)*$/,
    "Use a camelCase field path such as locationId or sourceRef.detail.",
  );

export const dayIdSchema = z
  .string()
  .regex(dayIdPattern, "Use a day identifier such as day-001.");

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date in YYYY-MM-DD format.")
  .refine(isIsoDate, "Use a valid calendar date.");

export const regionIdSchema = z.enum([
  "desert",
  "sierra",
  "norcal",
  "oregon",
  "washington",
]);

export const sourceReferenceSchema = z.object({
  document: z.string().min(1),
  blockType: z.enum(["heading", "paragraph", "table", "image", "manual"]),
  blockIndex: z.number().int().nonnegative(),
  detail: z.string().min(1).optional(),
});

export const sourceDocumentSchema = z.object({
  id: stableIdSchema,
  filename: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().positive(),
  counts: z.object({
    bodyBlocks: z.number().int().nonnegative(),
    paragraphs: z.number().int().nonnegative(),
    tables: z.number().int().nonnegative(),
    documentSections: z.number().int().positive(),
    trailEntries: z.number().int().nonnegative(),
    postTrailEntries: z.number().int().nonnegative(),
    gearItems: z.number().int().nonnegative(),
    glossaryConcepts: z.number().int().nonnegative(),
    photoPlacements: z.number().int().nonnegative(),
    mediaAssets: z.number().int().nonnegative(),
  }),
});

export const wordExtractionReportSchema = z.object({
  sourceDocumentId: stableIdSchema,
  generator: z.string().min(1),
  counts: z.object({
    trailEntries: z.number().int().nonnegative(),
    postTrailEntries: z.number().int().nonnegative(),
    gearItems: z.number().int().nonnegative(),
    glossaryConcepts: z.number().int().nonnegative(),
    photoPlacements: z.number().int().nonnegative(),
    mediaAssets: z.number().int().nonnegative(),
    reusedMediaAssets: z.number().int().nonnegative(),
    trailPhotoPlacements: z.number().int().nonnegative(),
    postTrailPhotoPlacements: z.number().int().nonnegative(),
    pagePhotoPlacements: z.number().int().nonnegative(),
    trailEntriesWithoutPhotos: z.number().int().nonnegative(),
  }),
  validations: z.object({
    sourceHashVerified: z.literal(true),
    structuralCountsVerified: z.literal(true),
    declaredMilesVerified: z.literal(true),
    displayedKilometersVerified: z.literal(true),
    trailMileageContinuous: z.literal(true),
    mediaRelationshipsMatched: z.literal(true),
    contentModelValidated: z.literal(true),
  }),
  structuralExceptions: z.array(z.string().min(1)),
});

const publishedEntityFields = {
  published: z.boolean().default(false),
  sourceRefs: z.array(sourceReferenceSchema).min(1),
};

export const regionSchema = z.object({
  id: regionIdSchema,
  order: z.number().int().min(1).max(5),
  trailMarkKey: stableIdSchema,
  ...publishedEntityFields,
});

export const sectionIdSchema = z
  .string()
  .regex(/^section-(?:california|oregon|washington)-[a-z0-9]+$/);

export const sectionSchema = z
  .object({
    id: sectionIdSchema,
    code: z.string().min(1),
    regionId: regionIdSchema,
    mileStart: z.number().nonnegative().optional(),
    mileEnd: z.number().positive().optional(),
    properName: z.string().min(1),
    ...publishedEntityFields,
  })
  .superRefine(({ mileStart, mileEnd }, context) => {
    if ((mileStart === undefined) !== (mileEnd === undefined)) {
      context.addIssue({
        code: "custom",
        message: "Provide both section mile bounds or neither.",
        path: [mileStart === undefined ? "mileStart" : "mileEnd"],
      });
    }

    if (
      mileStart !== undefined &&
      mileEnd !== undefined &&
      mileEnd <= mileStart
    ) {
      context.addIssue({
        code: "custom",
        message: "Section mileEnd must be greater than mileStart.",
        path: ["mileEnd"],
      });
    }
  });

const dayBaseFields = {
  id: dayIdSchema,
  sequence: z.number().int().positive(),
  date: isoDateSchema,
  published: z.boolean().default(false),
  sourceRefs: z.array(sourceReferenceSchema).min(1),
};

export const trailDaySchema = z.object({
  ...dayBaseFields,
  kind: z.literal("trail"),
  regionId: regionIdSchema,
  sectionIds: z.array(sectionIdSchema).min(1),
  mileStart: z.number().nonnegative(),
  mileEnd: z.number().nonnegative(),
  ascentMeters: z.number().nonnegative(),
  descentMeters: z.number().nonnegative(),
  locationId: stableIdSchema,
});

export const postTrailDaySchema = z.object({
  ...dayBaseFields,
  kind: z.literal("post-trail"),
  endDate: isoDateSchema.optional(),
});

export const daySchema = z.discriminatedUnion("kind", [
  trailDaySchema,
  postTrailDaySchema,
]);

export const journalEntrySchema = z.object({
  dayId: dayIdSchema,
  locale: localeSchema,
  title: z.string().min(1),
  locationLabel: z.string().min(1),
  summary: z.string().min(1).optional(),
  photoIds: z.array(stableIdSchema).default([]),
  sourceRefs: z.array(sourceReferenceSchema).min(1),
});

export const photoSchema = z
  .object({
    id: z.string().regex(photoIdPattern),
    dayId: dayIdSchema.optional(),
    pageId: stableIdSchema.optional(),
    order: z.number().int().nonnegative(),
    assetKey: stableIdSchema,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    published: z.boolean().default(false),
    sourceRefs: z.array(sourceReferenceSchema).min(1),
  })
  .refine(({ dayId, pageId }) => Boolean(dayId) !== Boolean(pageId), {
    message: "Associate a photo with exactly 1 day or supporting page.",
    path: ["dayId"],
  });

export const localizedPhotoSchema = z.object({
  photoId: z.string().regex(photoIdPattern),
  locale: localeSchema,
  alt: z.string().min(1),
  caption: z.string().min(1).optional(),
});

export const mediaVariantFormatSchema = z.enum(["avif", "webp"]);

export const mediaVariantSchema = z.object({
  format: mediaVariantFormatSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().positive(),
  path: z
    .string()
    .regex(/^pct-2026\/[a-z0-9-]+\/[a-f0-9]{64}-\d+\.(?:avif|webp)$/),
  url: z.url().optional(),
});

export const mediaAssetSchema = z.object({
  id: stableIdSchema,
  assetKey: stableIdSchema,
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  placeholder: z.object({
    dataUrl: z.string().regex(/^data:image\/webp;base64,/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  variants: z.array(mediaVariantSchema).min(2),
  published: z.boolean().default(false),
});

export const approvedMediaMatchSchema = z.object({
  assetKey: stableIdSchema,
  assetId: stableIdSchema,
  sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  similarity: z.number().min(0).max(1),
  approval: z.enum(["automatic", "manual"]),
});

export const routeCoordinateSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

export const trailRouteSchema = z.object({
  id: z.literal("pct-2026"),
  source: z.object({
    name: z.literal("Pacific Crest Trail Association"),
    revision: z.literal("2026"),
    centerlineUrl: z.literal(
      "https://services5.arcgis.com/ZldHa25efPFpMmfB/ArcGIS/rest/services/PCTA_Centerline/FeatureServer/0",
    ),
    centerlineLastEdit: z.literal("2026-01-06T23:18:04.221Z"),
    mileMarkersUrl: z.literal(
      "https://services5.arcgis.com/ZldHa25efPFpMmfB/ArcGIS/rest/services/PCT_Mile_Markers_2026/FeatureServer/0",
    ),
    mileMarkersLastEdit: z.literal("2026-01-07T00:14:06.948Z"),
    license: z.literal("CC BY 4.0"),
    licenseUrl: z.literal("https://creativecommons.org/licenses/by/4.0/"),
    attribution: z.literal(
      "Trail data © Pacific Crest Trail Association, CC BY 4.0, 2026",
    ),
  }),
  crs: z.literal("EPSG:4326"),
  officialLengthMiles: z.literal(2655.84),
  journalMaxMile: z.literal(2656),
  terminalClamp: z.object({
    fromMile: z.literal(2656),
    toMile: z.literal(2655.84),
  }),
  bounds: z.object({
    southwest: routeCoordinateSchema,
    northeast: routeCoordinateSchema,
  }),
  termini: z.object({
    south: routeCoordinateSchema,
    north: routeCoordinateSchema,
  }),
  coordinates: z.array(routeCoordinateSchema).min(2),
  anchors: z
    .array(
      z.object({
        mile: z.number().nonnegative(),
        routeProgress: z.number().min(0).max(1),
      }),
    )
    .min(2),
  normalization: z.object({
    maxAllowableOffsetDegrees: z.literal(0.00025),
    coordinatePrecision: z.literal(6),
    sourceCoordinateCount: z.number().int().positive(),
    sourceMarkerCount: z.number().int().positive(),
    validMarkerCount: z.number().int().positive(),
    excludedMarkerCount: z.number().int().nonnegative(),
    maxAnchorProjectionMeters: z.number().nonnegative(),
  }),
});

export const mapPointSchema = z.object({
  id: stableIdSchema,
  labelFr: z.string().min(1),
  labelEn: z.string().min(1),
  type: z.enum(["town", "resupply", "pass", "terminus"]),
  coordinates: routeCoordinateSchema,
  priority: z.number().int().min(1).max(3),
  minZoom: z.number().min(2).max(12),
  journalDayId: dayIdSchema.optional(),
});

const polygonCoordinatesSchema = z
  .array(z.array(routeCoordinateSchema).min(4))
  .min(1);

export const mapAreaSchema = z.object({
  id: stableIdSchema,
  kind: z.enum(["country", "state"]),
  code: z.string().min(2),
  name: z.string().min(1),
  geometry: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("Polygon"),
      coordinates: polygonCoordinatesSchema,
    }),
    z.object({
      type: z.literal("MultiPolygon"),
      coordinates: z.array(polygonCoordinatesSchema).min(1),
    }),
  ]),
  source: z.object({
    dataset: z.literal("Natural Earth"),
    scale: z.enum(["1:50m", "1:110m"]),
    url: z.url(),
    license: z.literal("Public domain"),
  }),
});

export const glossaryConceptSchema = z.object({
  id: stableIdSchema,
  published: z.boolean().default(false),
  sourceRefs: z.array(sourceReferenceSchema).min(1),
});

export const localizedGlossaryEntrySchema = z.object({
  conceptId: stableIdSchema,
  locale: localeSchema,
  term: z.string().min(1),
  definition: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
});

export const gearItemSchema = z.object({
  id: stableIdSchema,
  categoryId: stableIdSchema,
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  weightGrams: z.number().nonnegative(),
  tripPhase: regionIdSchema.optional(),
  published: z.boolean().default(false),
  sourceRefs: z.array(sourceReferenceSchema).min(1),
});

export const localizedGearEntrySchema = z.object({
  gearItemId: stableIdSchema,
  locale: localeSchema,
  name: z.string().min(1),
  detail: z.string().min(1).optional(),
});

export const gearProductLinkSchema = z.object({
  id: stableIdSchema,
  gearItemId: stableIdSchema,
  url: z.url(),
  sourceUrl: z.url(),
});

export const gearSummarySchema = z.object({
  id: stableIdSchema,
  baseWeightGrams: z.number().nonnegative(),
  sourceUrl: z.url(),
});

export const supportingPageKindSchema = z.enum([
  "introduction",
  "analysis",
  "gear",
  "people",
  "after-terminus",
  "closing",
]);

export const supportingPageSchema = z.object({
  pageId: stableIdSchema,
  locale: localeSchema,
  kind: supportingPageKindSchema,
  title: z.string().min(1),
  summary: z.string().min(1).optional(),
  published: z.boolean().default(false),
  sourceRefs: z.array(sourceReferenceSchema).min(1),
});

export const correctionSchema = z.object({
  id: z.string().regex(/^correction-\d{4}$/),
  entityType: z.enum([
    "region",
    "section",
    "day",
    "photo",
    "glossary-concept",
    "gear-item",
    "supporting-page",
  ]),
  entityId: stableIdSchema,
  field: correctionFieldSchema,
  sourceValue: z.json(),
  correctedValue: z.json(),
  reason: z.string().min(1),
  status: z.enum(["proposed", "approved", "rejected"]),
  sourceRef: sourceReferenceSchema,
});

export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export type SourceDocument = z.infer<typeof sourceDocumentSchema>;
export type WordExtractionReport = z.infer<typeof wordExtractionReportSchema>;
export type Region = z.infer<typeof regionSchema>;
export type TrailSection = z.infer<typeof sectionSchema>;
export type TrailDay = z.infer<typeof trailDaySchema>;
export type PostTrailDay = z.infer<typeof postTrailDaySchema>;
export type Day = z.infer<typeof daySchema>;
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type Photo = z.infer<typeof photoSchema>;
export type LocalizedPhoto = z.infer<typeof localizedPhotoSchema>;
export type MediaVariant = z.infer<typeof mediaVariantSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type ApprovedMediaMatch = z.infer<typeof approvedMediaMatchSchema>;
export type RouteCoordinate = z.infer<typeof routeCoordinateSchema>;
export type TrailRoute = z.infer<typeof trailRouteSchema>;
export type MapPoint = z.infer<typeof mapPointSchema>;
export type MapArea = z.infer<typeof mapAreaSchema>;
export type GlossaryConcept = z.infer<typeof glossaryConceptSchema>;
export type LocalizedGlossaryEntry = z.infer<
  typeof localizedGlossaryEntrySchema
>;
export type GearItem = z.infer<typeof gearItemSchema>;
export type LocalizedGearEntry = z.infer<typeof localizedGearEntrySchema>;
export type GearProductLink = z.infer<typeof gearProductLinkSchema>;
export type GearSummary = z.infer<typeof gearSummarySchema>;
export type SupportingPage = z.infer<typeof supportingPageSchema>;
export type Correction = z.infer<typeof correctionSchema>;
