import type { TrailDay } from "../lib/content/schemas.ts";
import { getProgressStop } from "../lib/trail/presentation.ts";
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
  positionLabel?: string;
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
}

export default function TrailProgressControl({
  sequence,
  regionId,
  regionLabel,
  positionLabel,
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
}: Props) {
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
          <strong>Jour {sequence}</strong>
          <span>{regionLabel}</span>
          {positionLabel ? <small>{positionLabel}</small> : null}
        </div>

        <label className="trail-progress__visually-hidden" htmlFor={controlId}>
          {controlLabel}
        </label>
        <input
          id={controlId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={[`Jour ${sequence}`, regionLabel, positionLabel]
            .filter(Boolean)
            .join(", ")}
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
