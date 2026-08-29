import { approvedMediaMatchSchema } from "../../src/lib/content/schemas.ts";
import type {
  ApprovedMediaMatch,
  MatchReport,
  MatchReportEntry,
} from "./types.ts";

function selectCandidate(
  entry: MatchReportEntry,
  decisions: Readonly<Record<string, string>>,
): ApprovedMediaMatch | undefined {
  const manualFingerprint = decisions[entry.assetKey];
  const candidate = manualFingerprint
    ? entry.candidates.find(
        ({ sourceFingerprint }) => sourceFingerprint === manualFingerprint,
      )
    : entry.status === "automatic"
      ? entry.candidates[0]
      : undefined;
  if (manualFingerprint && !candidate) {
    throw new Error(
      `Manual decision for ${entry.assetKey} does not match a report candidate.`,
    );
  }
  if (!candidate) return undefined;

  return approvedMediaMatchSchema.parse({
    assetKey: entry.assetKey,
    assetId: `media-${candidate.sourceFingerprint.slice(0, 16)}`,
    sourceFingerprint: candidate.sourceFingerprint,
    similarity: candidate.similarity,
    approval: manualFingerprint ? "manual" : "automatic",
  });
}

export function approveMatches(
  report: MatchReport,
  decisions: Readonly<Record<string, string>>,
): ApprovedMediaMatch[] {
  const matches = report.entries
    .map((entry) => selectCandidate(entry, decisions))
    .filter((match): match is ApprovedMediaMatch => Boolean(match))
    .sort((left, right) => left.assetKey.localeCompare(right.assetKey, "en"));
  const fingerprints = new Set<string>();
  for (const match of matches) {
    if (fingerprints.has(match.sourceFingerprint)) {
      throw new Error(
        `Original ${match.sourceFingerprint} is mapped to more than 1 Word asset.`,
      );
    }
    fingerprints.add(match.sourceFingerprint);
  }
  return matches;
}
