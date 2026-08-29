import { parseArguments, requiredArgument } from "./files.ts";
import { generateMediaAssets } from "./generation.ts";

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2), [
    "--matches",
    "--sources",
    "--output",
    "--manifest",
  ]);
  const assets = await generateMediaAssets({
    matchesPath: requiredArgument(arguments_, "--matches"),
    sourcesDirectory: requiredArgument(arguments_, "--sources"),
    outputDirectory: requiredArgument(arguments_, "--output"),
    manifestPath: requiredArgument(arguments_, "--manifest"),
  });
  process.stdout.write(
    `Generated ${assets.reduce((total, asset) => total + asset.variants.length, 0)} variants for ${assets.length} assets.\n`,
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
