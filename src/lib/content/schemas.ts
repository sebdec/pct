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

const stableIdSchema = z
  .string()
  .min(1)
  .regex(stableIdPattern, "Use a lowercase kebab-case identifier.");

export const dayIdSchema = z
  .string()
  .regex(dayIdPattern, "Use a day identifier such as day-001.");

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date in YYYY-MM-DD format.")
  .refine(isIsoDate, "Use a valid calendar date.");

const regionIdSchema = z.enum([
  "desert",
  "sierra",
  "norcal",
  "oregon",
  "washington",
]);

const publishedEntityFields = {
  published: z.boolean().default(false),
};

export const regionSchema = z.object({
  id: regionIdSchema,
  order: z.number().int().min(1).max(5),
  ...publishedEntityFields,
});

const sectionIdSchema = z
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

const postTrailDaySchema = z.object({
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
});

export const photoSchema = z
  .object({
    id: z.string().regex(photoIdPattern),
    dayId: dayIdSchema.optional(),
    pageId: stableIdSchema.optional(),
    assetKey: stableIdSchema,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    published: z.boolean().default(false),
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

const mediaVariantFormatSchema = z.enum(["avif", "webp"]);

const mediaVariantSchema = z.object({
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

const routeCoordinateSchema = z.tuple([
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
  order: z.number().int().positive(),
  categoryId: stableIdSchema,
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  weightGrams: z.number().nonnegative(),
  tripPhase: regionIdSchema.optional(),
  published: z.boolean().default(false),
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

const supportingPageKindSchema = z.enum([
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
});

export type Region = z.infer<typeof regionSchema>;
export type TrailSection = z.infer<typeof sectionSchema>;
export type TrailDay = z.infer<typeof trailDaySchema>;
export type Day = z.infer<typeof daySchema>;
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type Photo = z.infer<typeof photoSchema>;
export type LocalizedPhoto = z.infer<typeof localizedPhotoSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
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
export type SupportingPage = z.infer<typeof supportingPageSchema>;
