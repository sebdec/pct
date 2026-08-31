import type { TrailDay } from "../content/schemas.ts";

const regionColorVariables = {
  desert: "--pct-color-desert-dust",
  sierra: "--pct-color-sierra-snow",
  norcal: "--pct-color-norcal-forest",
  oregon: "--pct-color-oregon-lake",
  washington: "--pct-color-washington-mist",
} as const satisfies Record<TrailDay["regionId"], string>;

export type TrailMetricIconName =
  | "calendar"
  | "direction"
  | "duration"
  | "region"
  | "section"
  | "mile"
  | "distance"
  | "ascent"
  | "descent";

export function getProgressStop(
  value: number,
  min: number,
  max: number,
  thumbSizeRem = 1.5,
): string {
  const ratio = max > min ? (value - min) / (max - min) : 1;
  const boundedRatio = Math.max(0, Math.min(1, ratio));
  const percent = Number((boundedRatio * 100).toFixed(4));
  const thumbCorrection = Number(
    ((thumbSizeRem / 2) * (1 - 2 * boundedRatio)).toFixed(4),
  );
  const operator = thumbCorrection >= 0 ? "+" : "-";

  return `calc(${percent}% ${operator} ${Math.abs(thumbCorrection)}rem)`;
}

export function readRegionColors(): Record<TrailDay["regionId"], string> {
  const styles = getComputedStyle(document.documentElement);

  return Object.fromEntries(
    Object.entries(regionColorVariables).map(([regionId, variable]) => [
      regionId,
      styles.getPropertyValue(variable).trim(),
    ]),
  ) as Record<TrailDay["regionId"], string>;
}
