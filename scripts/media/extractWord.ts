import { parseArguments, requiredArgument } from "./files.ts";
import {
  assertIgnoredMediaWorkspace,
  extractWordMedia,
  readApprovedWordSource,
} from "./wordSource.ts";

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2), [
    "--word",
    "--output",
  ]);
  const wordPath = requiredArgument(arguments_, "--word");
  const outputDirectory = requiredArgument(arguments_, "--output");
  assertIgnoredMediaWorkspace(outputDirectory);
  const source = await readApprovedWordSource();
  const assets = await extractWordMedia({
    wordPath,
    outputDirectory,
    approvedFilename: source.filename,
    approvedSha256: source.sha256,
    expectedAssetCount: source.mediaAssets,
  });
  process.stdout.write(
    `Extracted ${assets.length} distinct Word media assets into the ignored workspace.\n`,
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
