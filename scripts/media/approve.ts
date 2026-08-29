import { approveMatches } from "./approval.ts";
import {
  parseArguments,
  readJson,
  requiredArgument,
  writeJson,
} from "./files.ts";
import type { MatchReport } from "./types.ts";

function assertReport(value: unknown): MatchReport {
  if (
    !value ||
    typeof value !== "object" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("entries" in value) ||
    !Array.isArray(value.entries)
  ) {
    throw new Error("The matching report is invalid.");
  }
  return value as MatchReport;
}

function assertDecisions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Manual decisions must be an object keyed by assetKey.");
  }
  for (const [assetKey, sourceFingerprint] of Object.entries(value)) {
    if (typeof sourceFingerprint !== "string") {
      throw new Error(`Manual decision for ${assetKey} must be a fingerprint.`);
    }
  }
  return value as Record<string, string>;
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2), [
    "--report",
    "--decisions",
    "--output",
  ]);
  const report = assertReport(
    await readJson(requiredArgument(arguments_, "--report")),
  );
  const decisions = arguments_.has("--decisions")
    ? assertDecisions(
        await readJson(requiredArgument(arguments_, "--decisions")),
      )
    : {};
  const outputPath = requiredArgument(arguments_, "--output");
  const matches = approveMatches(report, decisions);
  await writeJson(outputPath, matches);
  process.stdout.write(
    `Wrote ${matches.length} approved fingerprint associations.\n`,
  );
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
