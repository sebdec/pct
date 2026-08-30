import {
  formatDistance,
  formatDistanceRange,
  formatWeight,
  getDefaultDisplayPreferences,
} from "../lib/preferences/displayPreferences.ts";

type CommonProps = {
  prefix?: string;
  suffix?: string;
  className?: string;
  maximumFractionDigits?: number;
};

type DistanceProps = CommonProps & {
  distanceMiles: number;
  distanceEndMiles?: never;
  unitDisplay?: "short" | "long";
  weightGrams?: never;
};

type DistanceRangeProps = CommonProps & {
  distanceMiles: number;
  distanceEndMiles: number;
  unitDisplay?: never;
  weightGrams?: never;
};

type WeightProps = CommonProps & {
  weightGrams: number;
  distanceMiles?: never;
  distanceEndMiles?: never;
  unitDisplay?: never;
};

type Props = DistanceProps | DistanceRangeProps | WeightProps;

const fallbackPreferences = getDefaultDisplayPreferences("fr-FR");

export default function UnitValue(props: Props) {
  const { prefix = "", suffix = "", className, maximumFractionDigits } = props;
  let value: string;

  if (props.weightGrams !== undefined) {
    value = formatWeight(props.weightGrams, fallbackPreferences.weightUnit, {
      maximumFractionDigits,
    });
  } else if (props.distanceEndMiles !== undefined) {
    value = formatDistanceRange(
      props.distanceMiles,
      props.distanceEndMiles,
      fallbackPreferences.distanceUnit,
      { maximumFractionDigits },
    );
  } else {
    value = formatDistance(
      props.distanceMiles,
      fallbackPreferences.distanceUnit,
      {
        maximumFractionDigits,
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
      data-pct-prefix={prefix || undefined}
      data-pct-suffix={suffix || undefined}
      data-pct-unit-display={
        "unitDisplay" in props ? props.unitDisplay : undefined
      }
      data-pct-maximum-fraction-digits={maximumFractionDigits}
    >
      {prefix}
      {value}
      {suffix}
    </span>
  );
}
