import type { TrailMetricIconName } from "../lib/trail/presentation.ts";
import "./TrailMetricIcon.css";

interface Props {
  name: TrailMetricIconName;
}

export default function TrailMetricIcon({ name }: Props) {
  return (
    <svg
      className="trail-metric-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {name === "region" ? (
        <>
          <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
          <circle cx="12" cy="10" r="2" />
        </>
      ) : null}
      {name === "section" ? (
        <>
          <path d="M6 21V4" />
          <path d="M6 6h10l2 3-2 3H6" />
        </>
      ) : null}
      {name === "calendar" ? (
        <>
          <rect x="4" y="5.5" width="16" height="14" rx="2" />
          <path d="M8 3.5v4M16 3.5v4M4 10h16" />
        </>
      ) : null}
      {name === "direction" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z" />
        </>
      ) : null}
      {name === "duration" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3.2 2" />
        </>
      ) : null}
      {name === "mile" ? (
        <>
          <path d="M7.5 20V6.8c0-1 .8-1.8 1.8-1.8h5.4c1 0 1.8.8 1.8 1.8V20" />
          <path d="M5 20h14M10 9.2h4M10 12.5h2.7" />
        </>
      ) : null}
      {name === "distance" ? (
        <>
          <circle cx="5" cy="17.5" r="1.8" />
          <circle cx="19" cy="6.5" r="1.8" />
          <path d="M6.8 17.5c3.5 0 2.8-5 6.4-5s2.8-6 4-6" />
        </>
      ) : null}
      {name === "ascent" ? (
        <>
          <path d="m3.5 19 5.2-8.3 3.1 4.1 3.1-6.4 5.6 10.6" />
          <path d="M15.6 4.7h4v4M19.6 4.7l-5.1 5.1" />
        </>
      ) : null}
      {name === "descent" ? (
        <>
          <path d="m3.5 19 5.2-8.3 3.1 4.1 3.1-6.4 5.6 10.6" />
          <path d="M15.6 9.8h4v-4M19.6 9.8l-5.1-5.1" />
        </>
      ) : null}
    </svg>
  );
}
