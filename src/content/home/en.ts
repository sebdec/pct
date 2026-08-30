import type { TrailOverviewContent } from "../../components/TrailOverviewMetrics.tsx";
import { getRegionLabels } from "../../lib/content/regions.ts";

const regionLabels = getRegionLabels("en");

export const homeIntroduction = {
  beforeLink: "From April 18 to July 23, 2026, I hiked the ",
  linkLabel: "Pacific Crest Trail",
  linkHref: "https://www.pcta.org/",
  afterLink:
    " from Campo, on the Mexican border, to the Northern Terminus, on the Canadian border.",
} as const;

export const homeOverview = {
  heading: "The journey in numbers",
  metrics: [
    {
      icon: "direction",
      label: "Direction",
      value: "NOBO, Mexico to Canada",
    },
    {
      icon: "calendar",
      label: "Dates",
      value: "April 18 to July 23, 2026",
    },
    { icon: "duration", label: "Duration", value: "96 days" },
    {
      icon: "distance",
      label: "Distance",
      distanceMiles: 2_656,
      detailDistanceMiles: 27.7,
      detailDistanceSuffix: " / day",
    },
    {
      icon: "ascent",
      label: "Ascent",
      value: "+140,706 m",
      detail: "+1,466 m / day",
    },
    {
      icon: "descent",
      label: "Descent",
      value: "−140,301 m",
      detail: "−1,461 m / day",
    },
  ],
  regionsLabel: "Regions",
  regions: [
    { id: "desert", label: regionLabels.desert },
    { id: "sierra", label: regionLabels.sierra },
    { id: "norcal", label: regionLabels.norcal },
    { id: "oregon", label: regionLabels.oregon },
    { id: "washington", label: regionLabels.washington },
  ],
} as const satisfies TrailOverviewContent;
