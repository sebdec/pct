import { formatDate } from "../lib/content/dates.ts";
import type { Locale } from "../lib/content/locales.ts";
import { getUi } from "../lib/i18n/ui.ts";
import "./TrailDaySummary.css";

interface Action {
  href: string;
  label: string;
  reload?: boolean;
}

interface Props {
  sequence: number;
  locationLabel: string;
  date: string;
  endDate?: string;
  action?: Action;
  stableLocation?: boolean;
  className?: string;
  locale: Locale;
}

export default function TrailDaySummary({
  sequence,
  locationLabel,
  date,
  endDate,
  action,
  stableLocation = false,
  className,
  locale,
}: Props) {
  const labels = getUi(locale);
  return (
    <header
      className={`trail-day-summary${stableLocation ? " trail-day-summary--stable" : ""}${className ? ` ${className}` : ""}`}
    >
      <h1 aria-label={`${labels.day} ${sequence}, ${locationLabel}`}>
        <span>
          {labels.day} {sequence}
        </span>
        <span className="trail-day-summary__location">{locationLabel}</span>
      </h1>

      <div className="trail-day-summary__meta">
        <p className="trail-day-summary__date">
          <time dateTime={date}>{formatDate(date, locale)}</time>
          {endDate ? (
            <>
              <span>{locale === "fr" ? " au " : " to "}</span>
              <time dateTime={endDate}>{formatDate(endDate, locale)}</time>
            </>
          ) : null}
        </p>
        {action ? (
          <a
            className="pct-text-link trail-day-summary__action"
            href={action.href}
            data-astro-reload={action.reload ? "" : undefined}
          >
            {action.label}
          </a>
        ) : null}
      </div>
    </header>
  );
}
