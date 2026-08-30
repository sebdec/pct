import type { TrailDay } from "../lib/content/schemas.ts";
import { defaultLocale, type Locale } from "../lib/content/locales.ts";
import type { TrailMetricIconName } from "../lib/trail/presentation.ts";
import TrailMetricIcon from "./TrailMetricIcon.tsx";
import UnitValue from "./UnitValue.tsx";
import "./TrailMetricLabel.css";
import "./TrailOverviewMetrics.css";

interface OverviewMetric {
  icon: TrailMetricIconName;
  label: string;
  value?: string;
  distanceMiles?: number;
  distanceSuffix?: string;
  elevationMeters?: number;
  elevationPrefix?: string;
  detail?: string;
  detailDistanceMiles?: number;
  detailDistanceSuffix?: string;
  detailElevationMeters?: number;
  detailElevationPrefix?: string;
  detailElevationSuffix?: string;
}

export interface TrailOverviewContent {
  heading: string;
  metrics: readonly OverviewMetric[];
  regionsLabel: string;
  regions: readonly { id: TrailDay["regionId"]; label: string }[];
}

interface Props extends TrailOverviewContent {
  locale?: Locale;
}

export default function TrailOverviewMetrics({
  heading,
  metrics,
  regionsLabel,
  regions,
  locale = defaultLocale,
}: Props) {
  return (
    <section
      className="trail-overview-metrics"
      aria-labelledby="trail-overview-heading"
    >
      <h2 id="trail-overview-heading">{heading}</h2>

      <dl className="trail-overview-metrics__grid">
        {metrics.map(
          ({
            icon,
            label,
            value,
            distanceMiles,
            distanceSuffix,
            elevationMeters,
            elevationPrefix,
            detail,
            detailDistanceMiles,
            detailDistanceSuffix,
            detailElevationMeters,
            detailElevationPrefix,
            detailElevationSuffix,
          }) => (
            <div className="trail-overview-metrics__metric" key={label}>
              <dt className="trail-metric-label">
                <TrailMetricIcon name={icon} />
                <span>{label}</span>
              </dt>
              <dd>
                <span>
                  {distanceMiles !== undefined ? (
                    <UnitValue
                      locale={locale}
                      distanceMiles={distanceMiles}
                      suffix={distanceSuffix}
                    />
                  ) : elevationMeters !== undefined ? (
                    <UnitValue
                      locale={locale}
                      elevationMeters={elevationMeters}
                      prefix={elevationPrefix}
                    />
                  ) : (
                    value
                  )}
                </span>
                {detail ||
                detailDistanceMiles !== undefined ||
                detailElevationMeters !== undefined ? (
                  <small>
                    {detailDistanceMiles !== undefined ? (
                      <UnitValue
                        locale={locale}
                        distanceMiles={detailDistanceMiles}
                        suffix={detailDistanceSuffix}
                      />
                    ) : detailElevationMeters !== undefined ? (
                      <UnitValue
                        locale={locale}
                        elevationMeters={detailElevationMeters}
                        prefix={detailElevationPrefix}
                        suffix={detailElevationSuffix}
                      />
                    ) : (
                      detail
                    )}
                  </small>
                ) : null}
              </dd>
            </div>
          ),
        )}

        <div className="trail-overview-metrics__metric trail-overview-metrics__regions">
          <dt className="trail-metric-label">
            <TrailMetricIcon name="region" />
            <span>{regionsLabel}</span>
          </dt>
          <dd>
            {regions.map(({ id, label }) => (
              <span
                className={`trail-overview-metrics__region trail-overview-metrics__region--${id}`}
                key={id}
              >
                {label}
              </span>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}
