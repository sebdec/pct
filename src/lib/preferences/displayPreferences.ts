export const displayPreferencesStorageKey = "pct.display-preferences.v1";

export type DistanceUnit = "mi" | "km";
export type WeightUnit = "g" | "oz";

export interface DisplayPreferences {
  version: 1;
  language: "fr";
  distanceUnit: DistanceUnit;
  weightUnit: WeightUnit;
}

export const kilometersPerMile = 1.609344;
export const ouncesPerGram = 0.03527396195;

function isUsLocale(locale: string): boolean {
  try {
    return new Intl.Locale(locale).region === "US";
  } catch {
    return /(?:^|[-_])US$/i.test(locale);
  }
}

export function getDefaultDisplayPreferences(
  locale = "fr-FR",
): DisplayPreferences {
  const usesUsUnits = isUsLocale(locale);

  return {
    version: 1,
    language: "fr",
    distanceUnit: usesUsUnits ? "mi" : "km",
    weightUnit: usesUsUnits ? "oz" : "g",
  };
}

export function parseDisplayPreferences(
  value: string | null,
  locale = "fr-FR",
): DisplayPreferences {
  const fallback = getDefaultDisplayPreferences(locale);
  if (!value) return fallback;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return fallback;

    const candidate = parsed as Partial<DisplayPreferences>;
    if (
      candidate.version !== 1 ||
      candidate.language !== "fr" ||
      !["mi", "km"].includes(candidate.distanceUnit ?? "") ||
      !["g", "oz"].includes(candidate.weightUnit ?? "")
    ) {
      return fallback;
    }

    return candidate as DisplayPreferences;
  } catch {
    return fallback;
  }
}

function numberFormatter(
  locale: string,
  maximumFractionDigits: number,
): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, { maximumFractionDigits });
}

export function formatDistance(
  miles: number,
  unit: DistanceUnit,
  options: {
    locale?: string;
    maximumFractionDigits?: number;
    unitDisplay?: "short" | "long";
  } = {},
): string {
  const {
    locale = "fr-FR",
    maximumFractionDigits = 1,
    unitDisplay = "short",
  } = options;
  const value = unit === "mi" ? miles : miles * kilometersPerMile;
  const label =
    unitDisplay === "long"
      ? unit === "mi"
        ? value === 1
          ? "mile"
          : "miles"
        : "kilomètres"
      : unit;

  return `${numberFormatter(locale, maximumFractionDigits).format(value)} ${label}`;
}

export function formatDistanceRange(
  startMiles: number,
  endMiles: number,
  unit: DistanceUnit,
  options: { locale?: string; maximumFractionDigits?: number } = {},
): string {
  const { locale = "fr-FR", maximumFractionDigits = 1 } = options;
  const multiplier = unit === "mi" ? 1 : kilometersPerMile;
  const formatter = numberFormatter(locale, maximumFractionDigits);

  return `${formatter.format(startMiles * multiplier)} → ${formatter.format(endMiles * multiplier)} ${unit}`;
}

export function formatWeight(
  grams: number,
  unit: WeightUnit,
  options: { locale?: string; maximumFractionDigits?: number } = {},
): string {
  const { locale = "fr-FR", maximumFractionDigits = unit === "g" ? 0 : 1 } =
    options;
  const value = unit === "g" ? grams : grams * ouncesPerGram;

  return `${numberFormatter(locale, maximumFractionDigits).format(value)} ${unit}`;
}
