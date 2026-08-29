import { dayIdSchema } from "./schemas.ts";

function normalizeMile(mile: number): string {
  if (!Number.isFinite(mile) || mile < 0) {
    throw new RangeError("Mile must be a finite non-negative number.");
  }

  return Number(mile.toFixed(3)).toString();
}

export function homeUrl(): string {
  return "/";
}

export function journalDayUrl(dayId: string): string {
  return `/journal/${dayIdSchema.parse(dayId)}`;
}

export function exploreMileUrl(mile: number): string {
  const search = new URLSearchParams({ mile: normalizeMile(mile) });

  return `/explore?${search.toString()}`;
}
