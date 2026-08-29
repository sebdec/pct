import { parseArguments, requiredArgument } from "./files.ts";
import { validateMediaPipeline } from "./validation.ts";

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2), [
    "--matches",
    "--placements",
    "--manifest",
    "--output",
    "--report",
  ]);
  const report = await validateMediaPipeline({
    matchesPath: requiredArgument(arguments_, "--matches"),
    placementsPath: requiredArgument(arguments_, "--placements"),
    manifestPath: requiredArgument(arguments_, "--manifest"),
    outputDirectory: requiredArgument(arguments_, "--output"),
    reportPath: requiredArgument(arguments_, "--report"),
  });
  process.stdout.write(
    `Validated ${report.variantCount} variants (${report.totalBytes} bytes) for ${report.assetCount} assets.\n`,
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
