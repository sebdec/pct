import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import sharp from "sharp";

import {
  approvedMediaMatchSchema,
  mediaAssetSchema,
  type ApprovedMediaMatch,
  type MediaAsset,
  type MediaVariant,
} from "../../src/lib/content/schemas.ts";
import { listImageFiles, readJson, writeJson } from "./files.ts";
import { describeImage } from "./image.ts";
import { targetWidths } from "./types.ts";

function parseMatches(value: unknown): ApprovedMediaMatch[] {
  if (!Array.isArray(value)) {
    throw new Error("Approved matches must contain an array.");
  }
  return value.map((entry) => approvedMediaMatchSchema.parse(entry));
}

function applicableWidths(sourceWidth: number): number[] {
  const widths = targetWidths.filter((width) => width <= sourceWidth);
  return widths.length > 0 ? [...widths] : [sourceWidth];
}

async function createVariant(
  source: Uint8Array,
  outputDirectory: string,
  assetKey: string,
  sourceFingerprint: string,
  width: number,
  format: MediaVariant["format"],
): Promise<MediaVariant> {
  const path = `pct-2026/${assetKey}/${sourceFingerprint}-${width}.${format}`;
  const outputPath = resolve(outputDirectory, path);
  await mkdir(dirname(outputPath), { recursive: true });
  const pipeline = sharp(source)
    .rotate()
    .toColorspace("srgb")
    .resize({ width, withoutEnlargement: true });
  const { data, info } = await (
    format === "avif"
      ? pipeline.avif({ quality: 62, effort: 6 })
      : pipeline.webp({ quality: 78, effort: 6 })
  ).toBuffer({ resolveWithObject: true });
  await writeFile(outputPath, data);

  return {
    format,
    width: info.width,
    height: info.height,
    bytes: info.size,
    path,
  };
}

async function createAsset(
  match: ApprovedMediaMatch,
  sourcePath: string,
  outputDirectory: string,
): Promise<MediaAsset> {
  const source = await readFile(sourcePath);
  const descriptor = await describeImage(sourcePath, source);
  if (descriptor.fingerprint !== match.sourceFingerprint) {
    throw new Error(`Source fingerprint drift for ${match.assetKey}.`);
  }
  const placeholderResult = await sharp(source)
    .rotate()
    .toColorspace("srgb")
    .resize({ width: 24, withoutEnlargement: true })
    .blur(2)
    .webp({ quality: 25, effort: 6 })
    .toBuffer({ resolveWithObject: true });
  const variants: MediaVariant[] = [];

  for (const width of applicableWidths(descriptor.width)) {
    variants.push(
      await createVariant(
        source,
        outputDirectory,
        match.assetKey,
        match.sourceFingerprint,
        width,
        "avif",
      ),
    );
    variants.push(
      await createVariant(
        source,
        outputDirectory,
        match.assetKey,
        match.sourceFingerprint,
        width,
        "webp",
      ),
    );
  }

  return mediaAssetSchema.parse({
    id: match.assetId,
    assetKey: match.assetKey,
    sourceFingerprint: match.sourceFingerprint,
    width: descriptor.width,
    height: descriptor.height,
    placeholder: {
      dataUrl: `data:image/webp;base64,${placeholderResult.data.toString("base64")}`,
      width: placeholderResult.info.width,
      height: placeholderResult.info.height,
    },
    variants,
    published: false,
  });
}

export async function generateMediaAssets(options: {
  matchesPath: string;
  sourcesDirectory: string;
  outputDirectory: string;
  manifestPath: string;
}): Promise<MediaAsset[]> {
  const matches = parseMatches(await readJson(options.matchesPath));
  const sourcePaths = await listImageFiles(options.sourcesDirectory);
  const sourcesByFingerprint = new Map<string, string>();

  for (const sourcePath of sourcePaths) {
    const descriptor = await describeImage(sourcePath);
    if (sourcesByFingerprint.has(descriptor.fingerprint)) {
      throw new Error(
        `Duplicate original content detected for fingerprint ${descriptor.fingerprint}.`,
      );
    }
    sourcesByFingerprint.set(descriptor.fingerprint, sourcePath);
  }

  const assets: MediaAsset[] = [];
  for (const match of matches) {
    const sourcePath = sourcesByFingerprint.get(match.sourceFingerprint);
    if (!sourcePath) {
      throw new Error(
        `Approved original ${match.sourceFingerprint} is missing for ${match.assetKey}.`,
      );
    }
    assets.push(await createAsset(match, sourcePath, options.outputDirectory));
  }
  assets.sort((left, right) =>
    left.assetKey.localeCompare(right.assetKey, "en"),
  );
  await writeJson(options.manifestPath, assets);
  return assets;
}
