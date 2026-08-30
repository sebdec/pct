import type { TrailDay } from "../lib/content/schemas.ts";
import { defaultLocale, type Locale } from "../lib/content/locales.ts";
import { getUi } from "../lib/i18n/ui.ts";
import { getProgressStop } from "../lib/trail/presentation.ts";
import UnitValue from "./UnitValue.tsx";
import "./TrailProgressControl.css";

export interface TrailProgressStepAction {
  ariaLabel: string;
  href?: string;
  onClick?: () => void;
}

interface Props {
  sequence: number;
  regionId: TrailDay["regionId"] | null;
  regionLabel: string;
  positionMiles?: number | { start: number; end: number };
  min: number;
  max: number;
  step: number;
  value: number;
  controlId: string;
  controlLabel: string;
  navigationLabel: string;
  previous?: TrailProgressStepAction;
  next?: TrailProgressStepAction;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  className?: string;
  locale?: Locale;
}

export default function TrailProgressControl({
  sequence,
  regionId,
  regionLabel,
  positionMiles,
  min,
  max,
  step,
  value,
  controlId,
  controlLabel,
  navigationLabel,
  previous,
  next,
  onChange,
  onCommit,
  className,
  locale = defaultLocale,
}: Props) {
  const labels = getUi(locale);
  const progressStop = getProgressStop(value, min, max);
  const commit = () => onCommit?.(value);

  return (
    <nav
      className={`trail-progress${className ? ` ${className}` : ""}`}
      aria-label={navigationLabel}
      data-region={regionId ?? "after-trail"}
      style={{ "--trail-progress": progressStop } as React.CSSProperties}
    >
      <StepAction action={previous} direction="previous" />

      <div className="trail-progress__control">
        <div className="trail-progress__copy" aria-live="polite">
          <strong>
            {labels.day} {sequence}
          </strong>
          <span>{regionLabel}</span>
          {typeof positionMiles === "number" ? (
            <small>
              <UnitValue locale={locale} distanceMiles={positionMiles} />
            </small>
          ) : positionMiles ? (
            <small>
              <UnitValue
                locale={locale}
                distanceMiles={positionMiles.start}
                distanceEndMiles={positionMiles.end}
              />
            </small>
          ) : null}
        </div>

        <label className="trail-progress__visually-hidden" htmlFor={controlId}>
          {controlLabel}
        </label>
        <input
          suppressHydrationWarning
          id={controlId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={[`${labels.day} ${sequence}`, regionLabel].join(", ")}
          data-pct-distance-aria-miles={
            typeof positionMiles === "number"
              ? positionMiles
              : positionMiles?.end
          }
          data-pct-aria-prefix={`${labels.day} ${sequence}, ${regionLabel}, `}
          onChange={(event) => onChange(event.target.valueAsNumber)}
          onPointerUp={commit}
          onKeyUp={commit}
        />
      </div>

      <StepAction action={next} direction="next" />
    </nav>
  );
}

function StepAction({
  action,
  direction,
}: {
  action?: TrailProgressStepAction;
  direction: "previous" | "next";
}) {
  const arrow = direction === "previous" ? "←" : "→";

  if (!action) {
    return <span className="trail-progress__boundary" aria-hidden="true" />;
  }

  if (action.href) {
    return (
      <a
        className="trail-progress__step"
        href={action.href}
        aria-label={action.ariaLabel}
        onClick={
          action.onClick
            ? (event) => {
                event.preventDefault();
                action.onClick?.();
              }
            : undefined
        }
      >
        <span aria-hidden="true">{arrow}</span>
      </a>
    );
  }

  return (
    <button
      className="trail-progress__step"
      type="button"
      aria-label={action.ariaLabel}
      onClick={action.onClick}
    >
      <span aria-hidden="true">{arrow}</span>
    </button>
  );
}
