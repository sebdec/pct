import type { Locale } from "./locales.ts";
import type { TrailDay } from "./schemas.ts";

const localizedRegionLabels = {
  en: {
    desert: "Desert",
    sierra: "Sierra",
    norcal: "Northern California",
    oregon: "Oregon",
    washington: "Washington",
  },
  fr: {
    desert: "Désert",
    sierra: "Sierra",
    norcal: "Northern California",
    oregon: "Oregon",
    washington: "Washington",
  },
} as const satisfies Record<Locale, Record<TrailDay["regionId"], string>>;

export function getRegionLabels(locale: Locale) {
  return localizedRegionLabels[locale];
}
