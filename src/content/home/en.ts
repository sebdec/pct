import { getRegionLabels } from "../../lib/content/regions.ts";
import type { TrailOverviewContent } from "../../lib/trail/presentation.ts";

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
      elevationMeters: 140_706,
      elevationPrefix: "+",
      detailElevationMeters: 1_466,
      detailElevationPrefix: "+",
      detailElevationSuffix: " / day",
    },
    {
      icon: "descent",
      label: "Descent",
      elevationMeters: 140_301,
      elevationPrefix: "−",
      detailElevationMeters: 1_461,
      detailElevationPrefix: "−",
      detailElevationSuffix: " / day",
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
