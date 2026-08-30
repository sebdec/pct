import { useEffect, useRef, useState } from "react";

import type { JournalNavigatorItem } from "../lib/content/journalViewModel.ts";
import { defaultLocale, type Locale } from "../lib/content/locales.ts";
import { journalDayUrl } from "../lib/content/urls.ts";
import { getUi } from "../lib/i18n/ui.ts";
import TrailProgressControl from "./TrailProgressControl.tsx";

interface Props {
  currentDayId: string;
  entries: readonly JournalNavigatorItem[];
  locale?: Locale;
}

function positionMiles(
  entry: JournalNavigatorItem,
): { start: number; end: number } | undefined {
  if (entry.mileStart === null || entry.mileEnd === null) return undefined;

  return { start: entry.mileStart, end: entry.mileEnd };
}

export default function JournalProgressControl({
  currentDayId,
  entries,
  locale = defaultLocale,
}: Props) {
  const labels = getUi(locale);
  const currentIndex = entries.findIndex(({ dayId }) => dayId === currentDayId);

  if (currentIndex < 0) {
    throw new Error(`Missing journal navigator entry for ${currentDayId}.`);
  }

  const [previewIndex, setPreviewIndex] = useState(currentIndex);
  const pendingIndexRef = useRef(currentIndex);
  const navigationTimerRef = useRef<number | null>(null);
  const preview = entries[previewIndex]!;
  const previous = entries[previewIndex - 1];
  const next = entries[previewIndex + 1];

  useEffect(
    () => () => {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }
    },
    [],
  );

  function scheduleNavigation(offset: -1 | 1) {
    const pendingIndex = Math.min(
      entries.length - 1,
      Math.max(0, pendingIndexRef.current + offset),
    );

    pendingIndexRef.current = pendingIndex;
    setPreviewIndex(pendingIndex);

    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current);
    }

    navigationTimerRef.current = window.setTimeout(() => {
      const entry = entries[pendingIndexRef.current];
      if (entry && entry.dayId !== currentDayId) {
        window.location.assign(journalDayUrl(entry.dayId, locale));
      }
    }, 150);
  }

  return (
    <TrailProgressControl
      className="journal-progress"
      sequence={preview.sequence}
      regionId={preview.regionId}
      regionLabel={preview.regionLabel}
      positionMiles={positionMiles(preview)}
      min={0}
      max={entries.length - 1}
      step={1}
      value={previewIndex}
      controlId="journal-day-progress"
      locale={locale}
      controlLabel={labels.chooseJournalDay}
      navigationLabel={labels.journalQuickAccess}
      previous={
        previous
          ? {
              href: journalDayUrl(previous.dayId, locale),
              ariaLabel: `${labels.previousDay}, ${labels.day.toLowerCase()} ${previous.sequence}`,
              onClick: () => scheduleNavigation(-1),
            }
          : undefined
      }
      next={
        next
          ? {
              href: journalDayUrl(next.dayId, locale),
              ariaLabel: `${labels.nextDay}, ${labels.day.toLowerCase()} ${next.sequence}`,
              onClick: () => scheduleNavigation(1),
            }
          : undefined
      }
      onChange={(value) => {
        const nextIndex = Math.round(value);
        pendingIndexRef.current = nextIndex;
        setPreviewIndex(nextIndex);
      }}
      onCommit={(value) => {
        const entry = entries[Math.round(value)];
        if (entry && entry.dayId !== currentDayId) {
          window.location.assign(journalDayUrl(entry.dayId, locale));
        }
      }}
    />
  );
}
