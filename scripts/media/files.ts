import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { supportedImageExtensions, type PipelinePaths } from "./types.ts";

export const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

export function resolvePipelinePaths(outputDirectory?: string): PipelinePaths {
  const resolvedOutput = resolve(
    outputDirectory ?? resolve(repositoryRoot, ".media-workspace"),
  );

  return {
    repositoryRoot,
    outputDirectory: resolvedOutput,
    manifestPath: resolve(repositoryRoot, "src/data/media/assets.json"),
    matchesPath: resolve(
      repositoryRoot,
      "src/data/media/approved-matches.json",
    ),
    placementsPath: resolve(repositoryRoot, "src/data/media/photos.json"),
    reportPath: resolve(resolvedOutput, "media-report.json"),
  };
}

export function fingerprint(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function listImageFiles(directory: string): Promise<string[]> {
  const root = resolve(directory);
  const files: string[] = [];

  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (
        supportedImageExtensions.has(extname(entry.name).toLowerCase())
      ) {
        files.push(path);
      }
    }
  }

  await visit(root);
  return files.sort((left, right) =>
    relative(root, left).localeCompare(relative(root, right), "en"),
  );
}

export function parseArguments(
  arguments_: readonly string[],
  allowedFlags: readonly string[],
): Map<string, string | true> {
  const values = new Map<string, string | true>();
  const allowed = new Set(allowedFlags);

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--") continue;
    if (!argument?.startsWith("--") || !allowed.has(argument)) {
      throw new Error(`Unknown argument "${String(argument)}".`);
    }
    const next = arguments_[index + 1];
    if (!next || next.startsWith("--")) {
      values.set(argument, true);
      continue;
    }
    values.set(argument, next);
    index += 1;
  }

  return values;
}

export function requiredArgument(
  arguments_: ReadonlyMap<string, string | true>,
  name: string,
): string {
  const value = arguments_.get(name);
  if (typeof value !== "string" || !value) {
    throw new Error(`Missing required argument ${name}.`);
  }
  return resolve(value);
}

export function optionalArgument(
  arguments_: ReadonlyMap<string, string | true>,
  name: string,
): string | undefined {
  const value = arguments_.get(name);
  return typeof value === "string" ? resolve(value) : undefined;
}
