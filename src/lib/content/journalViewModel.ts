import { defaultLocale, type Locale } from "./locales.ts";
import {
  getTrailDayDistanceKilometers,
  getTrailDayDistanceMiles,
} from "./metrics.ts";
import { regionLabels } from "./regions.ts";
import type { Day, JournalEntry, Photo, TrailDay } from "./schemas.ts";

export interface JournalNavigationItem {
  dayId: string;
  sequence: number;
  locationLabel: string;
}

export interface JournalNavigatorItem extends JournalNavigationItem {
  regionId: TrailDay["regionId"] | null;
  regionLabel: string;
  mileStart: number | null;
  mileEnd: number | null;
}

export interface JournalTrailMetrics {
  mileStart: number;
  mileEnd: number;
  distanceMiles: number;
  distanceKilometers: number;
  ascentMeters: number;
  descentMeters: number;
}

export interface JournalPageViewModel {
  day: Day;
  entry: JournalEntry;
  photos: readonly Photo[];
  metrics: JournalTrailMetrics | null;
  regionId: TrailDay["regionId"] | null;
  regionLabel: string;
  previous: JournalNavigationItem | null;
  next: JournalNavigationItem | null;
}

export function buildJournalNavigatorItems(
  pages: readonly JournalPageViewModel[],
): JournalNavigatorItem[] {
  return pages.map((page) => ({
    ...navigationItem(page),
    regionId: page.regionId,
    regionLabel: page.regionLabel,
    mileStart: page.metrics?.mileStart ?? null,
    mileEnd: page.metrics?.mileEnd ?? null,
  }));
}

interface JournalViewModelSource {
  days: readonly Day[];
  journalEntries: readonly JournalEntry[];
  photos: readonly Photo[];
  locale?: Locale;
}

function indexUnique<T>(
  items: readonly T[],
  keyFor: (item: T) => string,
  label: string,
): Map<string, T> {
  const indexed = new Map<string, T>();

  for (const item of items) {
    const key = keyFor(item);

    if (indexed.has(key)) {
      throw new Error(`Duplicate ${label}: ${key}`);
    }

    indexed.set(key, item);
  }

  return indexed;
}

function navigationItem(page: JournalPageViewModel): JournalNavigationItem {
  return {
    dayId: page.day.id,
    sequence: page.day.sequence,
    locationLabel: page.entry.locationLabel,
  };
}

export function buildJournalViewModels({
  days,
  journalEntries,
  photos,
  locale = defaultLocale,
}: JournalViewModelSource): JournalPageViewModel[] {
  const dayById = indexUnique(days, ({ id }) => id, "day ID");
  const entriesForLocale = journalEntries.filter(
    (entry) => entry.locale === locale,
  );
  const entryByDayId = indexUnique(
    entriesForLocale,
    ({ dayId }) => dayId,
    `${locale} journal entry`,
  );
  const photoById = indexUnique(photos, ({ id }) => id, "photo ID");

  for (const entry of entriesForLocale) {
    if (!dayById.has(entry.dayId)) {
      throw new Error(
        `Journal entry ${locale}:${entry.dayId} references an unknown day.`,
      );
    }
  }

  const publishedDays = days
    .filter(({ published }) => published)
    .toSorted((left, right) => left.sequence - right.sequence);

  indexUnique(
    publishedDays,
    ({ sequence }) => String(sequence),
    "day sequence",
  );

  const pages = publishedDays.map<JournalPageViewModel>((day) => {
    const entry = entryByDayId.get(day.id);

    if (!entry) {
      throw new Error(
        `Published day ${day.id} is missing its ${locale} journal entry.`,
      );
    }

    indexUnique(
      entry.photoIds,
      (photoId) => photoId,
      `${day.id} photo reference`,
    );

    const entryPhotos = entry.photoIds.map((photoId) => {
      const photo = photoById.get(photoId);

      if (!photo) {
        throw new Error(`${day.id} references unknown photo ${photoId}.`);
      }

      if (photo.dayId !== day.id) {
        throw new Error(
          `${day.id} references ${photoId}, which belongs to ${photo.dayId ?? "a supporting page"}.`,
        );
      }

      return photo;
    });

    const metrics =
      day.kind === "trail"
        ? {
            mileStart: day.mileStart,
            mileEnd: day.mileEnd,
            distanceMiles: getTrailDayDistanceMiles(day),
            distanceKilometers: getTrailDayDistanceKilometers(day),
            ascentMeters: day.ascentMeters,
            descentMeters: day.descentMeters,
          }
        : null;

    return {
      day,
      entry,
      photos: entryPhotos,
      metrics,
      regionId: day.kind === "trail" ? day.regionId : null,
      regionLabel:
        day.kind === "trail" ? regionLabels[day.regionId] : "Après le trail",
      previous: null,
      next: null,
    };
  });

  return pages.map((page, index) => ({
    ...page,
    previous: index > 0 ? navigationItem(pages[index - 1]) : null,
    next: index < pages.length - 1 ? navigationItem(pages[index + 1]) : null,
  }));
}
