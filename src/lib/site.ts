import type { Locale } from "./content/locales.ts";
import {
  gearUrl,
  glossaryUrl,
  homeUrl,
  journalDayUrl,
  mapUrl,
} from "./content/urls.ts";

export const site = {
  title: "Pacific Crest Trail 2026",
  url: "https://pct.sebdec.com",
  socialCardPath: "/social-card.png",
  author: {
    name: "Sebdec / One Pole",
  },
  descriptions: {
    en: "A day-by-day journal and interactive map of a 2026 Pacific Crest Trail thru-hike.",
    fr: "Un journal quotidien et une carte interactive d’un thru-hike du Pacific Crest Trail en 2026.",
  },
} as const;

const navigationLabels = {
  en: {
    home: "Home",
    journal: "Journal",
    map: "Map",
    gear: "Gear",
    glossary: "Glossary",
  },
  fr: {
    home: "Accueil",
    journal: "Journal",
    map: "Carte",
    gear: "Équipement",
    glossary: "Glossaire",
  },
} as const;

export function getSiteNavigation(locale: Locale) {
  const labels = navigationLabels[locale];

  return [
    { id: "home", label: labels.home, href: homeUrl(locale) },
    {
      id: "journal",
      label: labels.journal,
      href: journalDayUrl("day-001", locale),
    },
    { id: "map", label: labels.map, href: mapUrl(locale) },
    { id: "gear", label: labels.gear, href: gearUrl(locale) },
    { id: "glossary", label: labels.glossary, href: glossaryUrl(locale) },
  ] as const;
}

export const sectionNames = [
  "Désert",
  "Sierra",
  "Northern California",
  "Oregon",
  "Washington",
] as const;
