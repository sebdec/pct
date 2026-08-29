import { dayIdSchema } from "./schemas.ts";
import { localeSchema, type Locale } from "./locales.ts";

function normalizeLocale(locale: Locale): Locale {
  return localeSchema.parse(locale);
}

function normalizeMile(mile: number): string {
  if (!Number.isFinite(mile) || mile < 0) {
    throw new RangeError("Mile must be a finite non-negative number.");
  }

  return Number(mile.toFixed(3)).toString();
}

export function homeUrl(locale: Locale): string {
  return `/${normalizeLocale(locale)}`;
}

export function journalDayUrl(locale: Locale, dayId: string): string {
  return `${homeUrl(locale)}/journal/${dayIdSchema.parse(dayId)}`;
}

export function exploreMileUrl(locale: Locale, mile: number): string {
  const search = new URLSearchParams({ mile: normalizeMile(mile) });

  return `${homeUrl(locale)}/explore?${search.toString()}`;
}
