import { z } from "astro/zod";

import { publishedLocales, sourceLocale } from "./locales.ts";
import { getRouteProgressAtMile } from "../map/route.ts";
import {
  daySchema,
  gearItemSchema,
  glossaryConceptSchema,
  journalEntrySchema,
  localizedGearEntrySchema,
  localizedGlossaryEntrySchema,
  localizedPhotoSchema,
  mediaAssetSchema,
  photoSchema,
  regionSchema,
  sectionSchema,
  trailRouteSchema,
  supportingPageSchema,
  type Day,
  type GearItem,
  type GlossaryConcept,
  type JournalEntry,
  type LocalizedGearEntry,
  type LocalizedGlossaryEntry,
  type LocalizedPhoto,
  type MediaAsset,
  type Photo,
  type Region,
  type SupportingPage,
  type TrailRoute,
  type TrailDay,
  type TrailSection,
} from "./schemas.ts";

const mileTolerance = 0.001;

export interface ContentModelSource {
  regions: readonly unknown[];
  sections: readonly unknown[];
  days: readonly unknown[];
  routes?: readonly unknown[];
  journalEntries: readonly unknown[];
  photos: readonly unknown[];
  mediaAssets: readonly unknown[];
  localizedPhotos: readonly unknown[];
  glossaryConcepts: readonly unknown[];
  localizedGlossaryEntries: readonly unknown[];
  gearItems: readonly unknown[];
  localizedGearEntries: readonly unknown[];
  supportingPages: readonly unknown[];
}

interface ContentValidationIssue {
  code: string;
  path: string;
  message: string;
}

interface ContentValidationResult {
  valid: boolean;
  issues: ContentValidationIssue[];
}

interface ParsedContentModel {
  regions: Region[];
  sections: TrailSection[];
  days: Day[];
  routes: TrailRoute[];
  journalEntries: JournalEntry[];
  photos: Photo[];
  mediaAssets: MediaAsset[];
  localizedPhotos: LocalizedPhoto[];
  glossaryConcepts: GlossaryConcept[];
  localizedGlossaryEntries: LocalizedGlossaryEntry[];
  gearItems: GearItem[];
  localizedGearEntries: LocalizedGearEntry[];
  supportingPages: SupportingPage[];
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
    regions: parseCollection("regions", source.regions, regionSchema, issues),
    sections: parseCollection(
      "sections",
      source.sections,
      sectionSchema,
      issues,
    ),
    days: parseCollection("days", source.days, daySchema, issues),
    routes: parseCollection(
      "routes",
      source.routes ?? [],
      trailRouteSchema,
      issues,
    ),
    journalEntries: parseCollection(
      "journalEntries",
      source.journalEntries,
      journalEntrySchema,
      issues,
    ),
    photos: parseCollection("photos", source.photos, photoSchema, issues),
    mediaAssets: parseCollection(
      "mediaAssets",
      source.mediaAssets,
      mediaAssetSchema,
      issues,
    ),
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
  };
}

function validateUniqueIdentifiers(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  findDuplicates(content.regions, "regions", ({ id }) => id, issues);
  findDuplicates(content.sections, "sections", ({ id }) => id, issues);
  findDuplicates(content.days, "days", ({ id }) => id, issues);
  findDuplicates(content.routes, "routes", ({ id }) => id, issues);
  findDuplicates(content.photos, "photos", ({ id }) => id, issues);
  findDuplicates(content.mediaAssets, "mediaAssets", ({ id }) => id, issues);
  findDuplicates(
    content.mediaAssets,
    "mediaAssets",
    ({ assetKey }) => assetKey,
    issues,
  );
  findDuplicates(
    content.glossaryConcepts,
    "glossaryConcepts",
    ({ id }) => id,
    issues,
  );
  findDuplicates(content.gearItems, "gearItems", ({ id }) => id, issues);
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

function validateGearOrder(
  gearItems: readonly GearItem[],
  issues: ContentValidationIssue[],
): void {
  gearItems
    .toSorted((left, right) => left.order - right.order)
    .forEach(({ id, order }, index) => {
      const expected = index + 1;
      if (order !== expected) {
        addIssue(
          issues,
          "gear.order",
          `gearItems.${id}.order`,
          `Expected equipment order ${expected} and received ${order}.`,
        );
      }
    });
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

function coordinatesMatch(
  left: readonly [number, number],
  right: readonly [number, number],
): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function validateTrailRoute(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  if (content.routes.length !== 1) {
    addIssue(
      issues,
      "route.count",
      "routes",
      `Expected 1 normalized PCT route and received ${content.routes.length}.`,
    );
  }
  const route = content.routes[0];
  if (!route) return;
  const firstCoordinate = route.coordinates[0]!;
  const lastCoordinate = route.coordinates.at(-1)!;
  if (!coordinatesMatch(firstCoordinate, route.termini.south)) {
    addIssue(
      issues,
      "route.terminus.south",
      "routes.pct-2026.termini.south",
      "The southern terminus must equal the first route coordinate.",
    );
  }
  if (!coordinatesMatch(lastCoordinate, route.termini.north)) {
    addIssue(
      issues,
      "route.terminus.north",
      "routes.pct-2026.termini.north",
      "The northern terminus must equal the last route coordinate.",
    );
  }

  route.anchors.forEach((anchor, index) => {
    const previous = route.anchors[index - 1];
    if (previous && anchor.mile <= previous.mile) {
      addIssue(
        issues,
        "route.anchor.mile-order",
        `routes.pct-2026.anchors[${index}].mile`,
        "Route anchor miles must be strictly increasing.",
      );
    }
    if (previous && anchor.routeProgress <= previous.routeProgress) {
      addIssue(
        issues,
        "route.anchor.progress-order",
        `routes.pct-2026.anchors[${index}].routeProgress`,
        "Route anchor progress must be strictly increasing.",
      );
    }
  });
  const firstAnchor = route.anchors[0];
  const lastAnchor = route.anchors.at(-1);
  if (firstAnchor?.mile !== 0 || firstAnchor.routeProgress !== 0) {
    addIssue(
      issues,
      "route.anchor.start",
      "routes.pct-2026.anchors[0]",
      "The first route anchor must map mile 0 to progress 0.",
    );
  }
  if (
    lastAnchor?.mile !== route.officialLengthMiles ||
    lastAnchor.routeProgress !== 1
  ) {
    addIssue(
      issues,
      "route.anchor.end",
      "routes.pct-2026.anchors",
      `The final route anchor must map mile ${route.officialLengthMiles} to progress 1.`,
    );
  }
  if (
    route.normalization.validMarkerCount +
      route.normalization.excludedMarkerCount !==
    route.normalization.sourceMarkerCount
  ) {
    addIssue(
      issues,
      "route.marker-count",
      "routes.pct-2026.normalization",
      "Valid and excluded marker counts must equal the source marker count.",
    );
  }
  if (route.coordinates.length !== route.normalization.sourceCoordinateCount) {
    addIssue(
      issues,
      "route.coordinate-count",
      "routes.pct-2026.coordinates",
      "Coordinate count must match the normalization report.",
    );
  }
  if (route.anchors.length !== route.normalization.validMarkerCount + 2) {
    addIssue(
      issues,
      "route.anchor-count",
      "routes.pct-2026.anchors",
      "Route anchors must contain every valid marker plus both termini.",
    );
  }
  if (route.normalization.maxAnchorProjectionMeters > 250) {
    addIssue(
      issues,
      "route.anchor-projection",
      "routes.pct-2026.normalization.maxAnchorProjectionMeters",
      "Maximum anchor projection must not exceed 250 meters.",
    );
  }
  const longitudes = route.coordinates.map(([longitude]) => longitude);
  const latitudes = route.coordinates.map(([, latitude]) => latitude);
  const expectedSouthwest = [
    Math.min(...longitudes),
    Math.min(...latitudes),
  ] as const;
  const expectedNortheast = [
    Math.max(...longitudes),
    Math.max(...latitudes),
  ] as const;
  if (!coordinatesMatch(route.bounds.southwest, expectedSouthwest)) {
    addIssue(
      issues,
      "route.bounds",
      "routes.pct-2026.bounds.southwest",
      "Southwest bounds must be derived from route coordinates.",
    );
  }
  if (!coordinatesMatch(route.bounds.northeast, expectedNortheast)) {
    addIssue(
      issues,
      "route.bounds",
      "routes.pct-2026.bounds.northeast",
      "Northeast bounds must be derived from route coordinates.",
    );
  }

  content.days.forEach((day) => {
    if (day.kind === "post-trail") return;
    const path = `days.${day.id}`;
    if (day.mileEnd > route.journalMaxMile) {
      addIssue(
        issues,
        "route.day.out-of-range",
        `${path}.mileEnd`,
        `Mile ${day.mileEnd} exceeds route domain ${route.journalMaxMile}.`,
      );
      return;
    }
    const unsupportedRoundedValue = [day.mileStart, day.mileEnd].find(
      (mile) =>
        mile > route.officialLengthMiles && mile !== route.journalMaxMile,
    );
    if (unsupportedRoundedValue !== undefined) {
      addIssue(
        issues,
        "route.day.unsupported-clamp",
        path,
        `Only journal mile ${route.journalMaxMile} may exceed official route mile ${route.officialLengthMiles}.`,
      );
      return;
    }
    const startProgress = getRouteProgressAtMile(route, day.mileStart);
    const endProgress = getRouteProgressAtMile(route, day.mileEnd);
    if (day.mileStart === day.mileEnd && startProgress !== endProgress) {
      addIssue(
        issues,
        "route.day.point",
        path,
        "A zero-mile trail day must map to a single route position.",
      );
    }
    if (day.mileEnd > day.mileStart && endProgress <= startProgress) {
      addIssue(
        issues,
        "route.day.range",
        path,
        "A positive-mile trail day must map to a non-empty route range.",
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

function validateJournalPhotoReferences(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const sourcePhotoIdsByDay = new Map<string, Set<string>>();
  content.journalEntries
    .filter(({ locale }) => locale === sourceLocale)
    .forEach(({ dayId, photoIds }) => {
      sourcePhotoIdsByDay.set(dayId, new Set(photoIds));
    });
  content.photos.forEach(({ id, dayId }) => {
    if (dayId && !sourcePhotoIdsByDay.get(dayId)?.has(id)) {
      addIssue(
        issues,
        "reference.photo.journal",
        `photos.${id}.dayId`,
        `Photo "${id}" is missing from the ${sourceLocale} journal entry for "${dayId}".`,
      );
    }
  });
}

const mediaVariantWidths = [640, 960, 1440, 1920] as const;
const mediaVariantFormats = ["avif", "webp"] as const;

function validateMediaAssets(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const placementAssetKeys = new Set(
    content.photos.map(({ assetKey }) => assetKey),
  );
  const assetsByKey = new Map(
    content.mediaAssets.map((asset) => [asset.assetKey, asset]),
  );

  findDuplicates(
    content.mediaAssets,
    "mediaAssets",
    ({ sourceFingerprint }) => sourceFingerprint,
    issues,
  );

  content.mediaAssets.forEach((asset) => {
    const path = `mediaAssets.${asset.id}`;
    const expectedId = `media-${asset.sourceFingerprint.slice(0, 16)}`;
    if (asset.id !== expectedId) {
      addIssue(
        issues,
        "media.id.fingerprint",
        `${path}.id`,
        `Expected identifier "${expectedId}" for source fingerprint ${asset.sourceFingerprint}.`,
      );
    }
    if (!placementAssetKeys.has(asset.assetKey)) {
      addIssue(
        issues,
        "reference.photo-asset",
        `${path}.assetKey`,
        `Unknown placement asset key "${asset.assetKey}".`,
      );
    }

    const expectedWidths = mediaVariantWidths.filter(
      (width) => width <= asset.width,
    );
    const applicableWidths =
      expectedWidths.length > 0 ? expectedWidths : [asset.width];
    const expectedVariants = new Set(
      applicableWidths.flatMap((width) =>
        mediaVariantFormats.map((format) => `${format}:${width}`),
      ),
    );
    const actualVariants = new Set<string>();

    asset.variants.forEach((variant, index) => {
      const key = `${variant.format}:${variant.width}`;
      if (actualVariants.has(key)) {
        addIssue(
          issues,
          "media.variant.duplicate",
          `${path}.variants[${index}]`,
          `Duplicate ${key} variant.`,
        );
      }
      actualVariants.add(key);

      const expectedPath = `pct-2026/${asset.assetKey}/${asset.sourceFingerprint}-${variant.width}.${variant.format}`;
      if (variant.path !== expectedPath) {
        addIssue(
          issues,
          "media.variant.path",
          `${path}.variants[${index}].path`,
          `Expected immutable path "${expectedPath}".`,
        );
      }
      if (variant.width > asset.width) {
        addIssue(
          issues,
          "media.variant.upscale",
          `${path}.variants[${index}].width`,
          `Variant width ${variant.width} exceeds source width ${asset.width}.`,
        );
      }
      const expectedHeight = Math.max(
        1,
        Math.round((asset.height * variant.width) / asset.width),
      );
      if (Math.abs(variant.height - expectedHeight) > 1) {
        addIssue(
          issues,
          "media.variant.aspect-ratio",
          `${path}.variants[${index}].height`,
          `Expected height ${expectedHeight} for width ${variant.width}.`,
        );
      }
      if (asset.published && !variant.url) {
        addIssue(
          issues,
          "media.variant.url.missing",
          `${path}.variants[${index}].url`,
          "Published media variants require a public URL.",
        );
      }
    });

    for (const expectedVariant of expectedVariants) {
      if (!actualVariants.has(expectedVariant)) {
        addIssue(
          issues,
          "media.variant.missing",
          `${path}.variants`,
          `Missing ${expectedVariant} variant.`,
        );
      }
    }
    for (const actualVariant of actualVariants) {
      if (!expectedVariants.has(actualVariant)) {
        addIssue(
          issues,
          "media.variant.unexpected",
          `${path}.variants`,
          `Unexpected ${actualVariant} variant.`,
        );
      }
    }
  });

  content.photos
    .filter(({ published }) => published)
    .forEach((photo) => {
      const asset = assetsByKey.get(photo.assetKey);
      if (!asset) {
        addIssue(
          issues,
          "reference.photo-asset",
          `photos.${photo.id}.assetKey`,
          `Published photo "${photo.id}" has no media asset.`,
        );
      } else if (!asset.published) {
        addIssue(
          issues,
          "media.asset.unpublished",
          `photos.${photo.id}.assetKey`,
          `Published photo "${photo.id}" references unpublished asset "${asset.id}".`,
        );
      }
    });
}

function validatePublishedLocaleCoverage(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
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

  const publishedPageIds = new Set(
    content.supportingPages
      .filter(({ published }) => published)
      .map(({ pageId }) => pageId),
  );
  content.photos
    .filter(({ published }) => published)
    .forEach(({ id }) => {
      if (!photoKeys.has(`${sourceLocale}:${id}`)) {
        addIssue(
          issues,
          `translation.${sourceLocale}.missing`,
          `photos.${id}`,
          `Published photo "${id}" requires ${sourceLocale} alternative text.`,
        );
      }
    });

  for (const requiredLocale of publishedLocales) {
    const issueCode = `translation.${requiredLocale}.missing`;

    content.days
      .filter(({ published }) => published)
      .forEach(({ id }) => {
        if (!journalKeys.has(`${requiredLocale}:${id}`)) {
          addIssue(
            issues,
            issueCode,
            `days.${id}`,
            `Published day "${id}" requires a ${requiredLocale} journal entry.`,
          );
        }
      });

    content.glossaryConcepts
      .filter(({ published }) => published)
      .forEach(({ id }) => {
        if (!glossaryKeys.has(`${requiredLocale}:${id}`)) {
          addIssue(
            issues,
            issueCode,
            `glossaryConcepts.${id}`,
            `Published glossary concept "${id}" requires a ${requiredLocale} definition.`,
          );
        }
      });

    content.gearItems
      .filter(({ published }) => published)
      .forEach(({ id }) => {
        if (!gearKeys.has(`${requiredLocale}:${id}`)) {
          addIssue(
            issues,
            issueCode,
            `gearItems.${id}`,
            `Published gear item "${id}" requires a ${requiredLocale} entry.`,
          );
        }
      });

    const localizedPublishedPageIds = new Set(
      content.supportingPages
        .filter(
          ({ locale, published }) => locale === requiredLocale && published,
        )
        .map(({ pageId }) => pageId),
    );

    publishedPageIds.forEach((pageId) => {
      if (!localizedPublishedPageIds.has(pageId)) {
        addIssue(
          issues,
          issueCode,
          `supportingPages.${pageId}`,
          `Published supporting page "${pageId}" requires a ${requiredLocale} entry.`,
        );
      }
    });
  }
}

function validateLocalizedJournalParity(
  content: ParsedContentModel,
  issues: ContentValidationIssue[],
): void {
  const sourceEntries = new Map(
    content.journalEntries
      .filter(({ locale }) => locale === sourceLocale)
      .map((entry) => [entry.dayId, entry]),
  );

  content.journalEntries
    .filter(({ locale }) => locale !== sourceLocale)
    .forEach((entry) => {
      const sourceEntry = sourceEntries.get(entry.dayId);
      if (!sourceEntry) return;

      if (
        JSON.stringify(entry.photoIds) !== JSON.stringify(sourceEntry.photoIds)
      ) {
        addIssue(
          issues,
          "translation.journal.photo-parity",
          `journalEntries.${entry.locale}:${entry.dayId}.photoIds`,
          `Localized journal entry "${entry.locale}:${entry.dayId}" must preserve the source photo order.`,
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
  validateGearOrder(content.gearItems, issues);
  validateSectionReferences(content, issues);
  validateDaySequence(content.days, issues);
  validateTrailDays(content, issues);
  if (source.routes !== undefined) validateTrailRoute(content, issues);
  validateEditorialReferences(content, issues);
  validateJournalPhotoReferences(content, issues);
  validateMediaAssets(content, issues);
  validatePublishedLocaleCoverage(content, issues);
  validateLocalizedJournalParity(content, issues);

  return { valid: issues.length === 0, issues };
}

export function assertContentModel(source: ContentModelSource): void {
  const result = validateContentModel(source);

  if (!result.valid) {
    throw new ContentValidationError(result.issues);
  }
}

function formatContentValidationIssues(
  issues: readonly ContentValidationIssue[],
): string {
  return issues
    .map(({ code, path, message }) => `[${code}] ${path}: ${message}`)
    .join("\n");
}
