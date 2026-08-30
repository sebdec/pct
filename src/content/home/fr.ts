import type { TrailOverviewContent } from "../../components/TrailOverviewMetrics.tsx";

export const homeIntroduction = {
  beforeLink: "Du 18 avril au 23 juillet 2026, j’ai parcouru le ",
  linkLabel: "Pacific Crest Trail",
  linkHref: "https://www.pcta.org/",
  afterLink:
    " de Campo, à la frontière mexicaine, jusqu’au Northern Terminus, à la frontière canadienne.",
} as const;

export const homeOverview = {
  heading: "Le parcours en quelques chiffres",
  metrics: [
    {
      icon: "direction",
      label: "Direction",
      value: "NOBO, du Mexique vers le Canada",
    },
    {
      icon: "calendar",
      label: "Dates",
      value: "du 18 avril au 23 juillet 2026",
    },
    { icon: "duration", label: "Durée", value: "96 jours" },
    { icon: "distance", label: "Distance", value: "2 656 miles" },
    {
      icon: "mile",
      label: "Distance moyenne",
      value: "27,7 miles par jour",
    },
    {
      icon: "ascent",
      label: "Ascension",
      value: "+140 706 m",
      detail: "+1 466 m par jour",
    },
    {
      icon: "descent",
      label: "Descente",
      value: "−140 301 m",
      detail: "−1 461 m par jour",
    },
  ],
  regionsLabel: "Régions",
  regions: [
    { id: "desert", label: "Southern California" },
    { id: "sierra", label: "Sierra Nevada" },
    { id: "norcal", label: "Northern California" },
    { id: "oregon", label: "Oregon" },
    { id: "washington", label: "Washington" },
  ],
} as const satisfies TrailOverviewContent;
