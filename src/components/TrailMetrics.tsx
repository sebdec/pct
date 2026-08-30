import type { TrailDay } from "../lib/content/schemas.ts";
import TrailMetricIcon from "./TrailMetricIcon.tsx";
import "./TrailMetrics.css";

export interface TrailSectionLabel {
  code: string;
  properName: string;
}

interface Props {
  regionId: TrailDay["regionId"];
  regionLabel: string;
  sections: readonly TrailSectionLabel[];
  positionLabel: string;
  distanceLabel: string;
  ascentLabel: string;
  descentLabel: string;
  className?: string;
}

export default function TrailMetrics({
  regionId,
  regionLabel,
  sections,
  positionLabel,
  distanceLabel,
  ascentLabel,
  descentLabel,
  className,
}: Props) {
  return (
    <aside
      className={`trail-metrics${className ? ` ${className}` : ""}`}
      aria-label="Repères de la journée"
      data-region={regionId}
    >
      <dl>
        <div className="trail-metrics__context trail-metrics__region">
          <dt>
            <TrailMetricIcon name="region" />
            <span>Région</span>
          </dt>
          <dd className="trail-metrics__region-name">{regionLabel}</dd>
        </div>
        <div className="trail-metrics__context trail-metrics__section">
          <dt>
            <TrailMetricIcon name="section" />
            <span>Section</span>
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
          label="Position"
        >
          {positionLabel}
        </Metric>
        <Metric
          className="trail-metrics__distance"
          icon="distance"
          label="Distance"
        >
          {distanceLabel}
        </Metric>
        <Metric
          className="trail-metrics__ascent"
          icon="ascent"
          label="Ascension"
        >
          {ascentLabel}
        </Metric>
        <Metric
          className="trail-metrics__descent"
          icon="descent"
          label="Descente"
        >
          {descentLabel}
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
      <dt>
        <TrailMetricIcon name={icon} />
        <span>{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
