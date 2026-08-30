import {
  formatDistance,
  formatDistanceRange,
  formatElevation,
  formatWeight,
  getDefaultDisplayPreferences,
} from "../lib/preferences/displayPreferences.ts";
import {
  defaultLocale,
  localeFormattingTags,
  type Locale,
} from "../lib/content/locales.ts";

type CommonProps = {
  locale?: Locale;
  prefix?: string;
  suffix?: string;
  className?: string;
  maximumFractionDigits?: number;
};

type DistanceProps = CommonProps & {
  distanceMiles: number;
  distanceEndMiles?: never;
  elevationMeters?: never;
  unitDisplay?: "short" | "long";
  weightGrams?: never;
};

type DistanceRangeProps = CommonProps & {
  distanceMiles: number;
  distanceEndMiles: number;
  elevationMeters?: never;
  unitDisplay?: never;
  weightGrams?: never;
};

type WeightProps = CommonProps & {
  weightGrams: number;
  distanceMiles?: never;
  distanceEndMiles?: never;
  elevationMeters?: never;
  unitDisplay?: never;
};

type ElevationProps = CommonProps & {
  elevationMeters: number;
  distanceMiles?: never;
  distanceEndMiles?: never;
  weightGrams?: never;
  unitDisplay?: never;
};

type Props = DistanceProps | DistanceRangeProps | WeightProps | ElevationProps;

export default function UnitValue(props: Props) {
  const {
    prefix = "",
    suffix = "",
    className,
    maximumFractionDigits,
    locale = defaultLocale,
  } = props;
  const formattingLocale = localeFormattingTags[locale];
  const fallbackPreferences = getDefaultDisplayPreferences(formattingLocale);
  let value: string;

  if (props.weightGrams !== undefined) {
    value = formatWeight(props.weightGrams, fallbackPreferences.weightUnit, {
      locale: formattingLocale,
      maximumFractionDigits,
    });
  } else if (props.elevationMeters !== undefined) {
    value = formatElevation(
      props.elevationMeters,
      fallbackPreferences.distanceUnit,
      { locale: formattingLocale, maximumFractionDigits },
    );
  } else if (props.distanceEndMiles !== undefined) {
    value = formatDistanceRange(
      props.distanceMiles,
      props.distanceEndMiles,
      fallbackPreferences.distanceUnit,
      { locale: formattingLocale, maximumFractionDigits },
    );
  } else {
    value = formatDistance(
      props.distanceMiles,
      fallbackPreferences.distanceUnit,
      {
        maximumFractionDigits,
        locale: formattingLocale,
        unitDisplay: props.unitDisplay,
      },
    );
  }

  return (
    <span
      className={className}
      suppressHydrationWarning
      data-pct-unit-value
      data-pct-distance-miles={
        "distanceMiles" in props ? props.distanceMiles : undefined
      }
      data-pct-distance-end-miles={
        "distanceEndMiles" in props ? props.distanceEndMiles : undefined
      }
      data-pct-weight-grams={
        props.weightGrams !== undefined ? props.weightGrams : undefined
      }
      data-pct-elevation-meters={
        props.elevationMeters !== undefined ? props.elevationMeters : undefined
      }
      data-pct-prefix={prefix || undefined}
      data-pct-suffix={suffix || undefined}
      data-pct-unit-display={
        "unitDisplay" in props ? props.unitDisplay : undefined
      }
      data-pct-maximum-fraction-digits={maximumFractionDigits}
    >
      {`${prefix}${value}${suffix}`}
    </span>
  );
}
