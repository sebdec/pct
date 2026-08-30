import type { TrailOverviewContent } from "../../components/TrailOverviewMetrics.tsx";
import { getRegionLabels } from "../../lib/content/regions.ts";

const regionLabels = getRegionLabels("fr");

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
    {
      icon: "distance",
      label: "Distance",
      distanceMiles: 2_656,
      detailDistanceMiles: 27.7,
      detailDistanceSuffix: " / jour",
    },
    {
      icon: "ascent",
      label: "Ascension",
      elevationMeters: 140_706,
      elevationPrefix: "+",
      detailElevationMeters: 1_466,
      detailElevationPrefix: "+",
      detailElevationSuffix: " / jour",
    },
    {
      icon: "descent",
      label: "Descente",
      elevationMeters: 140_301,
      elevationPrefix: "−",
      detailElevationMeters: 1_461,
      detailElevationPrefix: "−",
      detailElevationSuffix: " / jour",
    },
  ],
  regionsLabel: "Régions",
  regions: [
    { id: "desert", label: regionLabels.desert },
    { id: "sierra", label: regionLabels.sierra },
    { id: "norcal", label: regionLabels.norcal },
    { id: "oregon", label: regionLabels.oregon },
    { id: "washington", label: regionLabels.washington },
  ],
} as const satisfies TrailOverviewContent;
