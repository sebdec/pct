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
export type GlossaryConcept = z.infer<typeof glossaryConceptSchema>;
export type LocalizedGlossaryEntry = z.infer<
  typeof localizedGlossaryEntrySchema
>;
export type GearItem = z.infer<typeof gearItemSchema>;
export type LocalizedGearEntry = z.infer<typeof localizedGearEntrySchema>;
export type SupportingPage = z.infer<typeof supportingPageSchema>;
export type Correction = z.infer<typeof correctionSchema>;
