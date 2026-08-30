import { formatFrenchDate } from "../lib/content/dates.ts";
import "./TrailDaySummary.css";

interface Action {
  href: string;
  label: string;
}

interface Props {
  sequence: number;
  locationLabel: string;
  date: string;
  endDate?: string;
  action?: Action;
  stableLocation?: boolean;
}

export default function TrailDaySummary({
  sequence,
  locationLabel,
  date,
  endDate,
  action,
  stableLocation = false,
}: Props) {
  return (
    <header
      className={`trail-day-summary${stableLocation ? " trail-day-summary--stable" : ""}`}
    >
      <h1 aria-label={`Jour ${sequence}, ${locationLabel}`}>
        <span>Jour {sequence}</span>
        <span className="trail-day-summary__location">{locationLabel}</span>
      </h1>

      <div className="trail-day-summary__meta">
        <p className="trail-day-summary__date">
          <time dateTime={date}>{formatFrenchDate(date)}</time>
          {endDate ? (
            <>
              <span> au </span>
              <time dateTime={endDate}>{formatFrenchDate(endDate)}</time>
            </>
          ) : null}
        </p>
        {action ? (
          <a
            className="pct-text-link trail-day-summary__action"
            href={action.href}
          >
            {action.label}
          </a>
        ) : null}
      </div>
    </header>
  );
}
