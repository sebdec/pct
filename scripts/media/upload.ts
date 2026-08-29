import { parseArguments, requiredArgument } from "./files.ts";
import { uploadMediaAssets } from "./uploading.ts";

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2), [
    "--manifest",
    "--output",
    "--execute",
    "--confirm-upload",
  ]);
  const execute = arguments_.get("--execute") === true;
  const confirmation = arguments_.get("--confirm-upload");
  const result = await uploadMediaAssets({
    manifestPath: requiredArgument(arguments_, "--manifest"),
    outputDirectory: requiredArgument(arguments_, "--output"),
    execute,
    confirmation: typeof confirmation === "string" ? confirmation : undefined,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  process.stdout.write(
    execute
      ? `Uploaded or reused ${result.plan.length} immutable variants.\n`
      : `Dry run: ${result.plan.length} immutable variants would be checked or uploaded.\n`,
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
