import type { Day } from "../content/schemas.ts";
import {
  gearUrl,
  glossaryUrl,
  homeUrl,
  journalDayUrl,
  mapDayUrl,
  mapUrl,
} from "../content/urls.ts";

export interface LocalizedSitemapEntry {
  en: string;
  fr: string;
}

export function buildLocalizedSitemapEntries(
  days: readonly Day[],
): LocalizedSitemapEntry[] {
  const entries: LocalizedSitemapEntry[] = [
    { en: homeUrl("en"), fr: homeUrl("fr") },
    { en: mapUrl("en"), fr: mapUrl("fr") },
    { en: gearUrl("en"), fr: gearUrl("fr") },
    { en: glossaryUrl("en"), fr: glossaryUrl("fr") },
  ];

  for (const day of days
    .filter(({ published }) => published)
    .toSorted((left, right) => left.sequence - right.sequence)) {
    entries.push({
      en: journalDayUrl(day.id, "en"),
      fr: journalDayUrl(day.id, "fr"),
    });

    if (day.kind === "trail") {
      entries.push({
        en: mapDayUrl(day.id, "en"),
        fr: mapDayUrl(day.id, "fr"),
      });
    }
  }

  return entries;
}
