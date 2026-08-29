import { z } from "astro/zod";

import { publishedLocales } from "./locales.ts";
import {
  correctionSchema,
  daySchema,
  gearItemSchema,
  glossaryConceptSchema,
  journalEntrySchema,
  localizedGearEntrySchema,
  localizedGlossaryEntrySchema,
  localizedPhotoSchema,
  photoSchema,
  regionSchema,
  sectionSchema,
  sourceDocumentSchema,
  wordExtractionReportSchema,
  supportingPageSchema,
  type Correction,
  type Day,
  type GearItem,
  type GlossaryConcept,
  type JournalEntry,
  type LocalizedGearEntry,
  type LocalizedGlossaryEntry,
  type LocalizedPhoto,
  type Photo,
  type Region,
  type SupportingPage,
  type SourceDocument,
  type WordExtractionReport,
  type TrailDay,
  type TrailSection,
} from "./schemas.ts";

const mileTolerance = 0.001;

export interface ContentModelSource {
  sourceDocuments: readonly unknown[];
  extractionReports: readonly unknown[];
  regions: readonly unknown[];
  sections: readonly unknown[];
  days: readonly unknown[];
  journalEntries: readonly unknown[];
  photos: readonly unknown[];
  localizedPhotos: readonly unknown[];
  glossaryConcepts: readonly unknown[];
  localizedGlossaryEntries: readonly unknown[];
  gearItems: readonly unknown[];
  localizedGearEntries: readonly unknown[];
  supportingPages: readonly unknown[];
  corrections: readonly unknown[];
}

export interface ContentValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ContentValidationResult {
  valid: boolean;
  issues: ContentValidationIssue[];
}

interface ParsedContentModel {
  sourceDocuments: SourceDocument[];
  extractionReports: WordExtractionReport[];
  regions: Region[];
  sections: TrailSection[];
  days: Day[];
  journalEntries: JournalEntry[];
  photos: Photo[];
  localizedPhotos: LocalizedPhoto[];
  glossaryConcepts: GlossaryConcept[];
  localizedGlossaryEntries: LocalizedGlossaryEntry[];
  gearItems: GearItem[];
  localizedGearEntries: LocalizedGearEntry[];
  supportingPages: SupportingPage[];
  corrections: Correction[];
}

export class ContentValidationError extends Error {
  readonly issues: ContentValidationIssue[];

  constructor(issues: ContentValidationIssue[]) {
    super(formatContentValidationIssues(issues));
    this.name = "ContentValidationError";
    this.issues = issues;
  }
}

function addIssue(
  issues: ContentValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ code, path, message });
}

function parseCollection<T>(
  name: string,
  values: readonly unknown[],
  schema: z.ZodType<T>,
  issues: ContentValidationIssue[],
): T[] {
  const parsed: T[] = [];

  values.forEach((value, index) => {
    const result = schema.safeParse(value);

    if (result.success) {
      parsed.push(result.data);
      return;
    }

    for (const schemaIssue of result.error.issues) {
      const suffix = schemaIssue.path.length
        ? `.${schemaIssue.path.map(String).join(".")}`
        : "";
      addIssue(
        issues,
        "schema.invalid",
        `${name}[${index}]${suffix}`,
        schemaIssue.message,
      );
    }
  });

  return parsed;
}

function findDuplicates<T>(
  items: readonly T[],
  collection: string,
  getKey: (item: T) => string,
  issues: ContentValidationIssue[],
): void {
  const seen = new Set<string>();

  items.forEach((item, index) => {
    const key = getKey(item);

    if (seen.has(key)) {
      addIssue(
        issues,
        "id.duplicate",
        `${collection}[${index}]`,
        `Duplicate identifier "${key}".`,
      );
    }

    seen.add(key);
  });
}

function parseContentModel(
  source: ContentModelSource,
  issues: ContentValidationIssue[],
): ParsedContentModel {
  return {
    sourceDocuments: parseCollection(
      "sourceDocuments",
      source.sourceDocuments,
      sourceDocumentSchema,
      issues,
    ),
    extractionReports: parseCollection(
      "extractionReports",
      source.extractionReports,
      wordExtractionReportSchema,
      issues,
    ),
    regions: parseCollection("regions", source.regions, regionSchema, issues),
    sections: parseCollection(
      "sections",
      source.sections,
      sectionSchema,
      issues,
    ),
    days: parseCollection("days", source.days, daySchema, issues),
    journalEntries: parseCollection(
      "journalEntries",
      source.journalEntries,
      journalEntrySchema,
      issues,
    ),
    photos: parseCollection("photos", source.photos, photoSchema, issues),
    localizedPhotos: parseCollection(
      "localizedPhotos",
      source.localizedPhotos,
      localizedPhotoSchema,
      issues,
    ),
    glossaryConcepts: parseCollection(
      "glossaryConcepts",
      source.glossaryConcepts,
      glossaryConceptSchema,
      issues,
    ),
    localizedGlossaryEntries: parseCollection(
      "localizedGlossaryEntries",
      source.localizedGlossaryEntries,
      localizedGlossaryEntrySchema,
      issues,
    ),
    gearItems: parseCollection(
      "gearItems",
      source.gearItems,
      gearItemSchema,
      issues,
    ),
    localizedGearEntries: parseCollection(
      "localizedGearEntries",
      source.localizedGearEntries,
      localizedGearEntrySchema,
      issues,
    ),
    supportingPages: parseCollection(
      "supportingPages",
      source.supportingPages,
      supportingPageSchema,
      issues,
    ),
    corrections: parseCollection(
      "corrections",
      source.corrections,
      correctionSchema,
      issues,
    ),
  };
}

function validateUniqueIdentifiers(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  findDuplicates(
    content.sourceDocuments,
    "sourceDocuments",
    ({ id }) => id,
    issues,
  );
  findDuplicates(
    content.extractionReports,
    "extractionReports",
    ({ sourceDocumentId }) => sourceDocumentId,
    issues,
  );
  findDuplicates(content.regions, "regions", ({ id }) => id, issues);
  findDuplicates(content.sections, "sections", ({ id }) => id, issues);
  findDuplicates(content.days, "days", ({ id }) => id, issues);
  findDuplicates(content.photos, "photos", ({ id }) => id, issues);
  findDuplicates(
    content.glossaryConcepts,
    "glossaryConcepts",
    ({ id }) => id,
    issues,
  );
  findDuplicates(content.gearItems, "gearItems", ({ id }) => id, issues);
  findDuplicates(content.corrections, "corrections", ({ id }) => id, issues);
  findDuplicates(
    content.journalEntries,
    "journalEntries",
    ({ dayId, locale }) => `${locale}:${dayId}`,
    issues,
  );
  findDuplicates(
    content.localizedPhotos,
    "localizedPhotos",
    ({ photoId, locale }) => `${locale}:${photoId}`,
    issues,
  );
  findDuplicates(
    content.localizedGlossaryEntries,
    "localizedGlossaryEntries",
    ({ conceptId, locale }) => `${locale}:${conceptId}`,
    issues,
  );
  findDuplicates(
    content.localizedGearEntries,
    "localizedGearEntries",
    ({ gearItemId, locale }) => `${locale}:${gearItemId}`,
    issues,
  );
  findDuplicates(
    content.supportingPages,
    "supportingPages",
    ({ pageId, locale }) => `${locale}:${pageId}`,
    issues,
  );
}

function validateSectionReferences(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const regionIds = new Set(content.regions.map(({ id }) => id));
  const regionOrders = new Set<number>();

  if (content.regions.length > 0 && content.regions.length !== 5) {
    addIssue(
      issues,
      "region.count",
      "regions",
      `Expected the 5 PCT regions and received ${content.regions.length}.`,
    );
  }

  content.regions.forEach(({ order }, index) => {
    if (regionOrders.has(order)) {
      addIssue(
        issues,
        "region.order.duplicate",
        `regions[${index}].order`,
        `Region order ${order} is already used.`,
      );
    }
    regionOrders.add(order);
  });

  content.sections.forEach((section, index) => {
    if (!regionIds.has(section.regionId)) {
      addIssue(
        issues,
        "reference.region",
        `sections[${index}].regionId`,
        `Unknown region "${section.regionId}".`,
      );
    }
  });
}

function validateDaySequence(
  days: readonly Day[],
  issues: ContentValidationIssue[],
): void {
  const orderedDays = [...days].sort(
    (left, right) => left.sequence - right.sequence,
  );

  orderedDays.forEach((day, index) => {
    const expectedSequence = index + 1;
    const expectedId = `day-${String(day.sequence).padStart(3, "0")}`;

    if (day.sequence !== expectedSequence) {
      addIssue(
        issues,
        "day.sequence",
        `days.${day.id}.sequence`,
        `Expected sequence ${expectedSequence} and received ${day.sequence}.`,
      );
    }

    if (day.id !== expectedId) {
      addIssue(
        issues,
        "day.id.sequence",
        `days.${day.id}.id`,
        `Expected identifier "${expectedId}" for sequence ${day.sequence}.`,
      );
    }

    const previousDay = orderedDays[index - 1];
    const previousEndDate =
      previousDay?.kind === "post-trail"
        ? (previousDay.endDate ?? previousDay.date)
        : previousDay?.date;
    if (previousDay && previousEndDate && day.date < previousEndDate) {
      addIssue(
        issues,
        "day.date.order",
        `days.${day.id}.date`,
        `Date ${day.date} is before previous entry end date ${previousEndDate}.`,
      );
    }

    if (
      day.kind === "post-trail" &&
      day.endDate !== undefined &&
      day.endDate < day.date
    ) {
      addIssue(
        issues,
        "day.date.range",
        `days.${day.id}.endDate`,
        `End date ${day.endDate} is before start date ${day.date}.`,
      );
    }
  });
}

function validateSourceReferences(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const sourceFilenames = new Set(
    content.sourceDocuments.map(({ filename }) => filename),
  );

  const references: Array<{ path: string; document: string }> = [];
  const collect = (
    path: string,
    values: readonly { document: string }[],
  ): void => {
    values.forEach(({ document }, index) => {
      references.push({ path: `${path}.sourceRefs[${index}]`, document });
    });
  };

  content.regions.forEach((item) =>
    collect(`regions.${item.id}`, item.sourceRefs),
  );
  content.sections.forEach((item) =>
    collect(`sections.${item.id}`, item.sourceRefs),
  );
  content.days.forEach((item) => collect(`days.${item.id}`, item.sourceRefs));
  content.journalEntries.forEach((item) =>
    collect(`journalEntries.${item.locale}:${item.dayId}`, item.sourceRefs),
  );
  content.photos.forEach((item) =>
    collect(`photos.${item.id}`, item.sourceRefs),
  );
  content.glossaryConcepts.forEach((item) =>
    collect(`glossaryConcepts.${item.id}`, item.sourceRefs),
  );
  content.gearItems.forEach((item) =>
    collect(`gearItems.${item.id}`, item.sourceRefs),
  );
  content.supportingPages.forEach((item) =>
    collect(`supportingPages.${item.locale}:${item.pageId}`, item.sourceRefs),
  );
  content.corrections.forEach((item) =>
    collect(`corrections.${item.id}`, [item.sourceRef]),
  );

  references.forEach(({ path, document }) => {
    if (!sourceFilenames.has(document)) {
      addIssue(
        issues,
        "reference.source-document",
        path,
        `Unknown source document "${document}".`,
      );
    }
  });
}

function validateExtractionReport(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  if (content.sourceDocuments.length !== 1) {
    addIssue(
      issues,
      "source-document.count",
      "sourceDocuments",
      `Expected 1 source document and received ${content.sourceDocuments.length}.`,
    );
  }
  if (content.extractionReports.length !== 1) {
    addIssue(
      issues,
      "extraction-report.count",
      "extractionReports",
      `Expected 1 extraction report and received ${content.extractionReports.length}.`,
    );
  }

  const report = content.extractionReports[0];
  const sourceDocument = content.sourceDocuments[0];
  if (!report || !sourceDocument) return;
  if (report.sourceDocumentId !== sourceDocument.id) {
    addIssue(
      issues,
      "reference.source-document",
      "extractionReports[0].sourceDocumentId",
      `Unknown source document "${report.sourceDocumentId}".`,
    );
  }

  const trailDayIds = new Set(
    content.days.filter(({ kind }) => kind === "trail").map(({ id }) => id),
  );
  const postTrailDayIds = new Set(
    content.days
      .filter(({ kind }) => kind === "post-trail")
      .map(({ id }) => id),
  );
  const assetCounts = new Map<string, number>();
  content.photos.forEach(({ assetKey }) => {
    assetCounts.set(assetKey, (assetCounts.get(assetKey) ?? 0) + 1);
  });
  const actualCounts: WordExtractionReport["counts"] = {
    trailEntries: trailDayIds.size,
    postTrailEntries: postTrailDayIds.size,
    gearItems: content.gearItems.length,
    glossaryConcepts: content.glossaryConcepts.length,
    photoPlacements: content.photos.length,
    mediaAssets: assetCounts.size,
    reusedMediaAssets: [...assetCounts.values()].filter((count) => count > 1)
      .length,
    trailPhotoPlacements: content.photos.filter(
      ({ dayId }) => dayId && trailDayIds.has(dayId),
    ).length,
    postTrailPhotoPlacements: content.photos.filter(
      ({ dayId }) => dayId && postTrailDayIds.has(dayId),
    ).length,
    pagePhotoPlacements: content.photos.filter(({ pageId }) => pageId).length,
    trailEntriesWithoutPhotos: content.journalEntries.filter(
      ({ dayId, photoIds }) => trailDayIds.has(dayId) && photoIds.length === 0,
    ).length,
  };
  for (const [key, actual] of Object.entries(actualCounts) as Array<
    [keyof WordExtractionReport["counts"], number]
  >) {
    if (report.counts[key] !== actual) {
      addIssue(
        issues,
        "extraction-report.count.mismatch",
        `extractionReports[0].counts.${key}`,
        `Expected generated count ${actual} and received ${report.counts[key]}.`,
      );
    }
  }

  const manifestCountKeys = [
    "trailEntries",
    "postTrailEntries",
    "gearItems",
    "glossaryConcepts",
    "photoPlacements",
    "mediaAssets",
  ] as const;
  for (const key of manifestCountKeys) {
    if (sourceDocument.counts[key] !== report.counts[key]) {
      addIssue(
        issues,
        "source-document.count.mismatch",
        `sourceDocuments[0].counts.${key}`,
        `Manifest count ${sourceDocument.counts[key]} does not match report count ${report.counts[key]}.`,
      );
    }
  }
}

function validateTrailDays(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const regionIds = new Set(content.regions.map(({ id }) => id));
  const sectionIds = new Set(content.sections.map(({ id }) => id));
  const trailDays = content.days
    .filter((day): day is TrailDay => day.kind === "trail")
    .sort((left, right) => left.sequence - right.sequence);

  trailDays.forEach((day, index) => {
    if (!regionIds.has(day.regionId)) {
      addIssue(
        issues,
        "reference.region",
        `days.${day.id}.regionId`,
        `Unknown region "${day.regionId}".`,
      );
    }

    if (new Set(day.sectionIds).size !== day.sectionIds.length) {
      addIssue(
        issues,
        "reference.section.duplicate",
        `days.${day.id}.sectionIds`,
        "A day cannot reference the same section more than once.",
      );
    }

    day.sectionIds.forEach((sectionId) => {
      if (!sectionIds.has(sectionId)) {
        addIssue(
          issues,
          "reference.section",
          `days.${day.id}.sectionIds`,
          `Unknown section "${sectionId}".`,
        );
      }
    });

    if (day.mileEnd < day.mileStart) {
      addIssue(
        issues,
        "mileage.range",
        `days.${day.id}`,
        "Trail day mileEnd must be greater than or equal to mileStart.",
      );
    }

    const previousDay = trailDays[index - 1];
    if (!previousDay) return;

    const difference = day.mileStart - previousDay.mileEnd;
    if (difference > mileTolerance) {
      addIssue(
        issues,
        "mileage.gap",
        `days.${day.id}.mileStart`,
        `Gap of ${difference.toFixed(3)} miles after ${previousDay.id}.`,
      );
    } else if (difference < -mileTolerance) {
      addIssue(
        issues,
        "mileage.overlap",
        `days.${day.id}.mileStart`,
        `Overlap of ${Math.abs(difference).toFixed(3)} miles with ${previousDay.id}.`,
      );
    }
  });
}

function validateEditorialReferences(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const dayIds = new Set(content.days.map(({ id }) => id));
  const photoIds = new Set(content.photos.map(({ id }) => id));
  const conceptIds = new Set(content.glossaryConcepts.map(({ id }) => id));
  const gearItemIds = new Set(content.gearItems.map(({ id }) => id));
  const pageIds = new Set(content.supportingPages.map(({ pageId }) => pageId));
  const photosById = new Map(content.photos.map((photo) => [photo.id, photo]));

  content.journalEntries.forEach((entry) => {
    if (!dayIds.has(entry.dayId)) {
      addIssue(
        issues,
        "reference.day",
        `journalEntries.${entry.locale}:${entry.dayId}`,
        `Unknown day "${entry.dayId}".`,
      );
    }

    if (new Set(entry.photoIds).size !== entry.photoIds.length) {
      addIssue(
        issues,
        "reference.photo.duplicate",
        `journalEntries.${entry.locale}:${entry.dayId}.photoIds`,
        "A journal entry cannot reference the same photo more than once.",
      );
    }

    entry.photoIds.forEach((photoId) => {
      if (!photoIds.has(photoId)) {
        addIssue(
          issues,
          "reference.photo",
          `journalEntries.${entry.locale}:${entry.dayId}.photoIds`,
          `Unknown photo "${photoId}".`,
        );
        return;
      }

      if (photosById.get(photoId)?.dayId !== entry.dayId) {
        addIssue(
          issues,
          "reference.photo.day",
          `journalEntries.${entry.locale}:${entry.dayId}.photoIds`,
          `Photo "${photoId}" is not associated with day "${entry.dayId}".`,
        );
      }
    });
  });

  content.photos.forEach((photo) => {
    if (photo.dayId && !dayIds.has(photo.dayId)) {
      addIssue(
        issues,
        "reference.day",
        `photos.${photo.id}.dayId`,
        `Unknown day "${photo.dayId}".`,
      );
    }
    if (photo.pageId && !pageIds.has(photo.pageId)) {
      addIssue(
        issues,
        "reference.page",
        `photos.${photo.id}.pageId`,
        `Unknown supporting page "${photo.pageId}".`,
      );
    }
  });

  content.localizedPhotos.forEach(({ photoId, locale }) => {
    if (!photoIds.has(photoId)) {
      addIssue(
        issues,
        "reference.photo",
        `localizedPhotos.${locale}:${photoId}`,
        `Unknown photo "${photoId}".`,
      );
    }
  });

  content.localizedGlossaryEntries.forEach(({ conceptId, locale }) => {
    if (!conceptIds.has(conceptId)) {
      addIssue(
        issues,
        "reference.glossary",
        `localizedGlossaryEntries.${locale}:${conceptId}`,
        `Unknown glossary concept "${conceptId}".`,
      );
    }
  });

  content.localizedGearEntries.forEach(({ gearItemId, locale }) => {
    if (!gearItemIds.has(gearItemId)) {
      addIssue(
        issues,
        "reference.gear",
        `localizedGearEntries.${locale}:${gearItemId}`,
        `Unknown gear item "${gearItemId}".`,
      );
    }
  });
}

function validatePhotoPlacements(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const ordered = [...content.photos].sort(
    (left, right) => left.order - right.order,
  );
  ordered.forEach((photo, index) => {
    if (photo.order !== index) {
      addIssue(
        issues,
        "photo.order",
        `photos.${photo.id}.order`,
        `Expected placement order ${index} and received ${photo.order}.`,
      );
    }
  });

  const frenchPhotoIdsByDay = new Map<string, Set<string>>();
  content.journalEntries
    .filter(({ locale }) => locale === publishedLocales[0])
    .forEach(({ dayId, photoIds }) => {
      frenchPhotoIdsByDay.set(dayId, new Set(photoIds));
    });
  content.photos.forEach(({ id, dayId }) => {
    if (dayId && !frenchPhotoIdsByDay.get(dayId)?.has(id)) {
      addIssue(
        issues,
        "reference.photo.journal",
        `photos.${id}.dayId`,
        `Photo "${id}" is missing from the French journal entry for "${dayId}".`,
      );
    }
  });
}

function validateRequiredFrenchCopy(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const requiredLocale = publishedLocales[0];
  const journalKeys = new Set(
    content.journalEntries.map(({ dayId, locale }) => `${locale}:${dayId}`),
  );
  const photoKeys = new Set(
    content.localizedPhotos.map(
      ({ photoId, locale }) => `${locale}:${photoId}`,
    ),
  );
  const glossaryKeys = new Set(
    content.localizedGlossaryEntries.map(
      ({ conceptId, locale }) => `${locale}:${conceptId}`,
    ),
  );
  const gearKeys = new Set(
    content.localizedGearEntries.map(
      ({ gearItemId, locale }) => `${locale}:${gearItemId}`,
    ),
  );

  content.days
    .filter(({ published }) => published)
    .forEach(({ id }) => {
      if (!journalKeys.has(`${requiredLocale}:${id}`)) {
        addIssue(
          issues,
          "translation.fr.missing",
          `days.${id}`,
          `Published day "${id}" requires a French journal entry.`,
        );
      }
    });

  content.photos
    .filter(({ published }) => published)
    .forEach(({ id }) => {
      if (!photoKeys.has(`${requiredLocale}:${id}`)) {
        addIssue(
          issues,
          "translation.fr.missing",
          `photos.${id}`,
          `Published photo "${id}" requires French alternative text.`,
        );
      }
    });

  content.glossaryConcepts
    .filter(({ published }) => published)
    .forEach(({ id }) => {
      if (!glossaryKeys.has(`${requiredLocale}:${id}`)) {
        addIssue(
          issues,
          "translation.fr.missing",
          `glossaryConcepts.${id}`,
          `Published glossary concept "${id}" requires a French definition.`,
        );
      }
    });

  content.gearItems
    .filter(({ published }) => published)
    .forEach(({ id }) => {
      if (!gearKeys.has(`${requiredLocale}:${id}`)) {
        addIssue(
          issues,
          "translation.fr.missing",
          `gearItems.${id}`,
          `Published gear item "${id}" requires a French entry.`,
        );
      }
    });

  const publishedPageIds = new Set(
    content.supportingPages
      .filter(({ published }) => published)
      .map(({ pageId }) => pageId),
  );
  const frenchPublishedPageIds = new Set(
    content.supportingPages
      .filter(({ locale, published }) => locale === requiredLocale && published)
      .map(({ pageId }) => pageId),
  );

  publishedPageIds.forEach((pageId) => {
    if (!frenchPublishedPageIds.has(pageId)) {
      addIssue(
        issues,
        "translation.fr.missing",
        `supportingPages.${pageId}`,
        `Published supporting page "${pageId}" requires a French entry.`,
      );
    }
  });
}

function validateCorrections(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const idsByType: Record<Correction["entityType"], ReadonlySet<string>> = {
    region: new Set(content.regions.map(({ id }) => id)),
    section: new Set(content.sections.map(({ id }) => id)),
    day: new Set(content.days.map(({ id }) => id)),
    photo: new Set(content.photos.map(({ id }) => id)),
    "glossary-concept": new Set(content.glossaryConcepts.map(({ id }) => id)),
    "gear-item": new Set(content.gearItems.map(({ id }) => id)),
    "supporting-page": new Set(
      content.supportingPages.map(({ pageId }) => pageId),
    ),
  };

  content.corrections.forEach(({ id, entityType, entityId }) => {
    const entityIds = idsByType[entityType];
    if (!entityIds.has(entityId)) {
      addIssue(
        issues,
        "reference.correction",
        `corrections.${id}.entityId`,
        `Unknown ${entityType} correction target "${entityId}".`,
      );
    }
  });
}

export function validateContentModel(
  source: ContentModelSource,
): ContentValidationResult {
  const issues: ContentValidationIssue[] = [];
  const content = parseContentModel(source, issues);

  validateUniqueIdentifiers(content, issues);
  validateSourceReferences(content, issues);
  validateExtractionReport(content, issues);
  validateSectionReferences(content, issues);
  validateDaySequence(content.days, issues);
  validateTrailDays(content, issues);
  validateEditorialReferences(content, issues);
  validatePhotoPlacements(content, issues);
  validateRequiredFrenchCopy(content, issues);
  validateCorrections(content, issues);

  return { valid: issues.length === 0, issues };
}

export function assertContentModel(source: ContentModelSource): void {
  const result = validateContentModel(source);

  if (!result.valid) {
    throw new ContentValidationError(result.issues);
  }
}

export function formatContentValidationIssues(
  issues: readonly ContentValidationIssue[],
): string {
  return issues
    .map(({ code, path, message }) => `[${code}] ${path}: ${message}`)
    .join("\n");
}
