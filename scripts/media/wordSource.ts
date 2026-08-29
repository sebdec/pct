import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";

import { readOoxml } from "../content/word/readOoxml.ts";
import { readJson, repositoryRoot, writeJson } from "./files.ts";

interface SourceManifest {
  filename: string;
  sha256: string;
  mediaAssets: number;
}

export interface ExtractedWordAsset {
  assetKey: string;
  sourceFingerprint: string;
  filename: string;
  bytes: number;
}

function assertSourceManifest(value: unknown): SourceManifest {
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    typeof value[0] !== "object" ||
    value[0] === null ||
    !("filename" in value[0]) ||
    typeof value[0].filename !== "string" ||
    !("sha256" in value[0]) ||
    typeof value[0].sha256 !== "string" ||
    !("counts" in value[0]) ||
    typeof value[0].counts !== "object" ||
    value[0].counts === null ||
    !("mediaAssets" in value[0].counts) ||
    typeof value[0].counts.mediaAssets !== "number"
  ) {
    throw new Error("src/data/source/word-source.json is invalid.");
  }
  return {
    filename: value[0].filename,
    sha256: value[0].sha256,
    mediaAssets: value[0].counts.mediaAssets,
  };
}

function normalizedExtension(mediaPath: string): string {
  const extension = extname(mediaPath).toLowerCase();
  if (!new Set([".jpeg", ".jpg", ".png", ".webp"]).has(extension)) {
    throw new Error(`Unsupported embedded Word image format "${extension}".`);
  }
  return extension === ".jpeg" ? ".jpg" : extension;
}

export async function extractWordMedia(options: {
  wordPath: string;
  outputDirectory: string;
  approvedFilename: string;
  approvedSha256: string;
  expectedAssetCount: number;
}): Promise<ExtractedWordAsset[]> {
  const document = await readOoxml(options.wordPath, options.approvedSha256);
  if (document.filename !== options.approvedFilename) {
    throw new Error(
      `Unexpected source filename. Expected "${options.approvedFilename}" and received "${document.filename}".`,
    );
  }
  const outputDirectory = resolve(options.outputDirectory);
  await mkdir(dirname(outputDirectory), { recursive: true });
  const stagingDirectory = await mkdtemp(
    resolve(dirname(outputDirectory), ".word-media-staging-"),
  );
  const assets: ExtractedWordAsset[] = [];
  const fingerprints = new Set<string>();

  try {
    for (const [mediaPath, bytes] of document.media) {
      const sourceFingerprint = createHash("sha256")
        .update(bytes)
        .digest("hex");
      if (fingerprints.has(sourceFingerprint)) continue;
      fingerprints.add(sourceFingerprint);
      const assetKey = `word-media-${sourceFingerprint.slice(0, 16)}`;
      const filename = `${assetKey}${normalizedExtension(mediaPath)}`;
      await writeFile(resolve(stagingDirectory, filename), bytes);
      assets.push({
        assetKey,
        sourceFingerprint,
        filename,
        bytes: bytes.byteLength,
      });
    }
    assets.sort((left, right) =>
      left.assetKey.localeCompare(right.assetKey, "en"),
    );
    if (assets.length !== options.expectedAssetCount) {
      throw new Error(
        `Unexpected embedded media count. Expected ${options.expectedAssetCount} and extracted ${assets.length}.`,
      );
    }
    await writeJson(resolve(stagingDirectory, "index.json"), assets);
    await rm(outputDirectory, { recursive: true, force: true });
    await rename(stagingDirectory, outputDirectory);
    return assets;
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function readApprovedWordSource(): Promise<SourceManifest> {
  return assertSourceManifest(
    await readJson(resolve(repositoryRoot, "src/data/source/word-source.json")),
  );
}

export function assertIgnoredMediaWorkspace(outputDirectory: string): void {
  const workspace = resolve(repositoryRoot, ".media-workspace");
  const output = resolve(outputDirectory);
  const pathFromWorkspace = relative(workspace, output);
  if (
    !pathFromWorkspace ||
    pathFromWorkspace.startsWith("..") ||
    resolve(workspace, pathFromWorkspace) !== output
  ) {
    throw new Error(`Word media output must be a child of ${workspace}.`);
  }
}
