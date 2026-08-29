import { useState } from "react";

import type { JournalNavigatorItem } from "../lib/content/journalViewModel.ts";
import { journalDayUrl } from "../lib/content/urls.ts";
import TrailProgressControl from "./TrailProgressControl.tsx";

interface Props {
  currentDayId: string;
  entries: readonly JournalNavigatorItem[];
}

function positionLabel(entry: JournalNavigatorItem): string | undefined {
  if (entry.mileStart === null || entry.mileEnd === null) return undefined;

  return `${entry.mileStart.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} → ${entry.mileEnd.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} mi`;
}

export default function JournalProgressControl({
  currentDayId,
  entries,
}: Props) {
  const currentIndex = entries.findIndex(({ dayId }) => dayId === currentDayId);

  if (currentIndex < 0) {
    throw new Error(`Missing journal navigator entry for ${currentDayId}.`);
  }

  const [previewIndex, setPreviewIndex] = useState(currentIndex);
  const preview = entries[previewIndex]!;
  const previous = entries[currentIndex - 1];
  const next = entries[currentIndex + 1];

  return (
    <TrailProgressControl
      className="journal-progress"
      sequence={preview.sequence}
      regionId={preview.regionId}
      regionLabel={preview.regionLabel}
      positionLabel={positionLabel(preview)}
      min={0}
      max={entries.length - 1}
      step={1}
      value={previewIndex}
      controlId="journal-day-progress"
      controlLabel="Choisir une journée du journal"
      navigationLabel="Accès rapide aux journées"
      previous={
        previous
          ? {
              href: journalDayUrl(previous.dayId),
              ariaLabel: `Jour précédent, jour ${previous.sequence}`,
            }
          : undefined
      }
      next={
        next
          ? {
              href: journalDayUrl(next.dayId),
              ariaLabel: `Jour suivant, jour ${next.sequence}`,
            }
          : undefined
      }
      onChange={(value) => setPreviewIndex(Math.round(value))}
      onCommit={(value) => {
        const entry = entries[Math.round(value)];
        if (entry && entry.dayId !== currentDayId) {
          window.location.assign(journalDayUrl(entry.dayId));
        }
      }}
    />
  );
}
