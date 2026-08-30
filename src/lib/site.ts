export const site = {
  title: "Pacific Crest Trail 2026",
  description:
    "Un journal du Pacific Crest Trail pensé comme une exploration sensible du parcours.",
  language: "fr",
  navigation: [
    { label: "Journal", href: "/journal/day-001" },
    { label: "Carte", href: "/map" },
    { label: "Équipement", href: "/gear" },
    { label: "Glossaire", href: "/glossary" },
  ],
} as const;

export const sectionNames = [
  "Désert",
  "Sierra",
  "Northern California",
  "Oregon",
  "Washington",
] as const;
