import type { TrailDay } from "./schemas.ts";

export const kilometersPerMile = 1.609344;

export function milesToKilometers(miles: number): number {
  if (!Number.isFinite(miles) || miles < 0) {
    throw new RangeError("Miles must be a finite non-negative number.");
  }

  return miles * kilometersPerMile;
}

export function getTrailDayDistanceMiles(day: TrailDay): number {
  return day.mileEnd - day.mileStart;
}

export function getTrailDayDistanceKilometers(day: TrailDay): number {
  return milesToKilometers(getTrailDayDistanceMiles(day));
}

export function getCumulativeTrailMiles(
  days: readonly TrailDay[],
  throughSequence?: number,
): number {
  return days
    .filter(
      (day) => throughSequence === undefined || day.sequence <= throughSequence,
    )
    .reduce((total, day) => total + getTrailDayDistanceMiles(day), 0);
}
