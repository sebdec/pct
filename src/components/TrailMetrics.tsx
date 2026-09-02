import type { TrailDay } from "../lib/content/schemas.ts";
import type { Locale } from "../lib/content/locales.ts";
import { getUi } from "../lib/i18n/ui.ts";
import TrailMetricIcon from "./TrailMetricIcon.tsx";
import UnitValue from "./UnitValue.tsx";
import "./TrailMetricLabel.css";
import "./TrailMetrics.css";

interface TrailSectionLabel {
  code: string;
  properName: string;
}

interface Props {
  regionId: TrailDay["regionId"];
  regionLabel: string;
  sections: readonly TrailSectionLabel[];
  positionMiles: { start: number; end: number };
  distanceMiles: number;
  ascentMeters: number;
  descentMeters: number;
  className?: string;
  locale: Locale;
}

export default function TrailMetrics({
  regionId,
  regionLabel,
  sections,
  positionMiles,
  distanceMiles,
  ascentMeters,
  descentMeters,
  className,
  locale,
}: Props) {
  const labels = getUi(locale);
  return (
    <aside
      className={`trail-metrics${className ? ` ${className}` : ""}`}
      aria-label={labels.dayMarkers}
      data-region={regionId}
    >
      <dl>
        <div className="trail-metrics__context trail-metrics__region">
          <dt className="trail-metric-label">
            <TrailMetricIcon name="region" />
            <span>{labels.region}</span>
          </dt>
          <dd className="trail-metrics__region-name">{regionLabel}</dd>
        </div>
        <div className="trail-metrics__context trail-metrics__section">
          <dt className="trail-metric-label">
            <TrailMetricIcon name="section" />
            <span>{labels.section}</span>
          </dt>
          <dd
            className="trail-metrics__section-list"
            title={sections
              .map(({ code, properName }) => `${code} ${properName}`)
              .join(" / ")}
          >
            {sections.map((section) => (
              <span
                key={`${section.code}-${section.properName}`}
                title={`${section.code} ${section.properName}`}
              >
                <strong>{section.code}</strong> {section.properName}
              </span>
            ))}
          </dd>
        </div>
        <Metric
          className="trail-metrics__position"
          icon="mile"
          label={labels.position}
        >
          <UnitValue
            locale={locale}
            distanceMiles={positionMiles.start}
            distanceEndMiles={positionMiles.end}
          />
        </Metric>
        <Metric
          className="trail-metrics__distance"
          icon="distance"
          label={labels.distance}
        >
          <UnitValue locale={locale} distanceMiles={distanceMiles} />
        </Metric>
        <Metric
          className="trail-metrics__ascent"
          icon="ascent"
          label={labels.ascent}
        >
          <UnitValue
            locale={locale}
            elevationMeters={ascentMeters}
            prefix="+"
          />
        </Metric>
        <Metric
          className="trail-metrics__descent"
          icon="descent"
          label={labels.descent}
        >
          <UnitValue
            locale={locale}
            elevationMeters={descentMeters}
            prefix="−"
          />
        </Metric>
      </dl>
    </aside>
  );
}

function Metric({
  className,
  icon,
  label,
  children,
}: {
  className: string;
  icon: "mile" | "distance" | "ascent" | "descent";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`trail-metrics__metric ${className}`}>
      <dt className="trail-metric-label">
        <TrailMetricIcon name={icon} />
        <span>{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
