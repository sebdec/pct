import type { TrailDay } from "./schemas.ts";

export const regionLabels = {
  desert: "Désert",
  sierra: "Sierra",
  norcal: "Northern California",
  oregon: "Oregon",
  washington: "Washington",
} as const satisfies Record<TrailDay["regionId"], string>;
