import type { TrailDay } from "../lib/content/schemas.ts";
import type { TrailMetricIconName } from "../lib/trail/presentation.ts";
import TrailMetricIcon from "./TrailMetricIcon.tsx";
import "./TrailMetricLabel.css";
import "./TrailOverviewMetrics.css";

interface OverviewMetric {
  icon: TrailMetricIconName;
  label: string;
  value: string;
  detail?: string;
}

export interface TrailOverviewContent {
  heading: string;
  metrics: readonly OverviewMetric[];
  regionsLabel: string;
  regions: readonly { id: TrailDay["regionId"]; label: string }[];
}

export default function TrailOverviewMetrics({
  heading,
  metrics,
  regionsLabel,
  regions,
}: TrailOverviewContent) {
  return (
    <section
      className="trail-overview-metrics"
      aria-labelledby="trail-overview-heading"
    >
      <h2 id="trail-overview-heading">{heading}</h2>

      <dl className="trail-overview-metrics__grid">
        {metrics.map(({ icon, label, value, detail }) => (
          <div className="trail-overview-metrics__metric" key={label}>
            <dt className="trail-metric-label">
              <TrailMetricIcon name={icon} />
              <span>{label}</span>
            </dt>
            <dd>{value}</dd>
            {detail ? <small>{detail}</small> : null}
          </div>
        ))}

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
