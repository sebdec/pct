import { formatFrenchDate } from "../content/dates.ts";
import {
  getTrailDayDistanceKilometers,
  getTrailDayDistanceMiles,
  milesToKilometers,
} from "../content/metrics.ts";
import { regionLabels } from "../content/regions.ts";
import type { Locale } from "../content/locales.ts";
import type { Day, JournalEntry, TrailDay } from "../content/schemas.ts";

export interface MapDayViewModel {
  id: string;
  sequence: number;
  date: string;
  dateLabel: string;
  locationLabel: string;
  regionId: TrailDay["regionId"];
  regionLabel: string;
  mileStart: number;
  mileEnd: number;
  distanceMiles: number;
  distanceKilometers: number;
  cumulativeMiles: number;
  cumulativeKilometers: number;
  ascentMeters: number;
  descentMeters: number;
  journalHref: string;
}

interface BuildMapDaysSource {
  days: readonly Day[];
  journalEntries: readonly JournalEntry[];
  locale?: Locale;
}

export interface MapSelection {
  dayId: string;
  mile: number;
}

function indexLocations(
  entries: readonly JournalEntry[],
  locale: Locale,
): Map<string, string> {
  const locations = new Map<string, string>();

  for (const entry of entries) {
    if (entry.locale !== locale) continue;
    if (locations.has(entry.dayId)) {
      throw new Error(`Duplicate ${locale} map location for ${entry.dayId}.`);
    }
    locations.set(entry.dayId, entry.locationLabel);
  }

  return locations;
}

export function buildMapDayViewModels({
  days,
  journalEntries,
  locale = "fr",
}: BuildMapDaysSource): MapDayViewModel[] {
  const locations = indexLocations(journalEntries, locale);

  return days
    .filter((day): day is TrailDay => day.kind === "trail" && day.published)
    .toSorted((left, right) => left.sequence - right.sequence)
    .map((day) => {
      const locationLabel = locations.get(day.id);

      if (!locationLabel) {
        throw new Error(
          `Published trail day ${day.id} is missing its ${locale} location label.`,
        );
      }

      return {
        id: day.id,
        sequence: day.sequence,
        date: day.date,
        dateLabel: formatFrenchDate(day.date),
        locationLabel,
        regionId: day.regionId,
        regionLabel: regionLabels[day.regionId],
        mileStart: day.mileStart,
        mileEnd: day.mileEnd,
        distanceMiles: getTrailDayDistanceMiles(day),
        distanceKilometers: getTrailDayDistanceKilometers(day),
        cumulativeMiles: day.mileEnd,
        cumulativeKilometers: milesToKilometers(day.mileEnd),
        ascentMeters: day.ascentMeters,
        descentMeters: day.descentMeters,
        journalHref: `/journal/${day.id}`,
      };
    });
}

function requireDays(days: readonly MapDayViewModel[]): void {
  if (days.length === 0) {
    throw new RangeError("The map requires at least 1 published trail day.");
  }
}

function clampMapMile(days: readonly MapDayViewModel[], mile: number): number {
  if (!Number.isFinite(mile)) return days[0]!.mileStart;

  return Math.max(days[0]!.mileStart, Math.min(days.at(-1)!.mileEnd, mile));
}

export function getMapDayForMile(
  days: readonly MapDayViewModel[],
  mile: number,
): MapDayViewModel {
  requireDays(days);

  const boundedMile = clampMapMile(days, mile);

  return days.find((day) => boundedMile <= day.mileEnd) ?? days.at(-1)!;
}

export function selectMapMile(
  days: readonly MapDayViewModel[],
  mile: number,
): MapSelection {
  requireDays(days);
  const day = getMapDayForMile(days, mile);
  const boundedMile = clampMapMile(days, mile);

  return { dayId: day.id, mile: boundedMile };
}

export function selectMapDay(
  days: readonly MapDayViewModel[],
  dayId: string,
): MapSelection {
  requireDays(days);
  const day = days.find(({ id }) => id === dayId) ?? days[0]!;

  return { dayId: day.id, mile: day.mileEnd };
}

export function initialMapSelection(
  days: readonly MapDayViewModel[],
): MapSelection {
  requireDays(days);
  return { dayId: days[0]!.id, mile: days[0]!.mileStart };
}
