import { parseArguments, requiredArgument, writeJson } from "./files.ts";
import { createMatchReport } from "./matching.ts";

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2), [
    "--word",
    "--sources",
    "--report",
  ]);
  const wordPath = requiredArgument(arguments_, "--word");
  const sourcesDirectory = requiredArgument(arguments_, "--sources");
  const reportPath = requiredArgument(arguments_, "--report");
  const report = await createMatchReport(wordPath, sourcesDirectory);
  await writeJson(reportPath, report);
  process.stdout.write(
    `Matched ${report.counts.wordAssets} Word assets: ${report.counts.automatic} automatic, ${report.counts.ambiguous} ambiguous and ${report.counts.unmatched} unmatched.\n`,
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
