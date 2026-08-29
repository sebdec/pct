import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

import {
  approvedMediaMatchSchema,
  mediaAssetSchema,
  photoSchema,
  type ApprovedMediaMatch,
  type MediaAsset,
  type MediaVariant,
  type Photo,
} from "../../src/lib/content/schemas.ts";
import { readJson, writeJson } from "./files.ts";
import { targetWidths, type MediaReport } from "./types.ts";

const byteBudgets: Record<MediaVariant["format"], Record<number, number>> = {
  avif: { 640: 200_000, 960: 400_000, 1440: 800_000, 1920: 1_200_000 },
  webp: { 640: 250_000, 960: 525_000, 1440: 1_000_000, 1920: 1_500_000 },
};

function parseArray<T>(
  value: unknown,
  label: string,
  parse: (entry: unknown) => T,
): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} must contain an array.`);
  return value.map(parse);
}

function assertUnique<T>(
  values: readonly T[],
  label: string,
  key: (value: T) => string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const identifier = key(value);
    if (seen.has(identifier))
      throw new Error(`Duplicate ${label} ${identifier}.`);
    seen.add(identifier);
  }
}

function budgetFor(variant: MediaVariant): number {
  const budgets = byteBudgets[variant.format];
  const configured = budgets[variant.width];
  if (configured) return configured;
  const smallest = Math.min(...Object.keys(budgets).map(Number));
  return Math.ceil((budgets[smallest] ?? 250_000) * (variant.width / smallest));
}

async function validateVariantFile(
  outputDirectory: string,
  variant: MediaVariant,
): Promise<void> {
  const path = resolve(outputDirectory, variant.path);
  const file = await stat(path).catch(() => undefined);
  if (!file) throw new Error(`Missing generated variant ${variant.path}.`);
  if (file.size !== variant.bytes) {
    throw new Error(
      `Byte size drift for ${variant.path}: manifest ${variant.bytes}, file ${file.size}.`,
    );
  }
  if (variant.bytes > budgetFor(variant)) {
    throw new Error(
      `${variant.path} exceeds its provisional ${budgetFor(variant)} byte budget.`,
    );
  }
  const metadata = await sharp(path).metadata();
  if (metadata.width !== variant.width || metadata.height !== variant.height) {
    throw new Error(`Dimension drift for ${variant.path}.`);
  }
  if (metadata.exif || metadata.iptc || metadata.xmp) {
    throw new Error(`Private metadata remains in ${variant.path}.`);
  }
}

export async function validateMediaPipeline(options: {
  matchesPath: string;
  placementsPath: string;
  manifestPath: string;
  outputDirectory: string;
  reportPath?: string;
}): Promise<MediaReport> {
  const [matches, placements, assets] = await Promise.all([
    readJson(options.matchesPath).then((value) =>
      parseArray<ApprovedMediaMatch>(value, "Approved matches", (entry) =>
        approvedMediaMatchSchema.parse(entry),
      ),
    ),
    readJson(options.placementsPath).then((value) =>
      parseArray<Photo>(value, "Photo placements", (entry) =>
        photoSchema.parse(entry),
      ),
    ),
    readJson(options.manifestPath).then((value) =>
      parseArray<MediaAsset>(value, "Media manifest", (entry) =>
        mediaAssetSchema.parse(entry),
      ),
    ),
  ]);
  assertUnique(matches, "approved asset key", ({ assetKey }) => assetKey);
  assertUnique(
    matches,
    "approved source fingerprint",
    ({ sourceFingerprint }) => sourceFingerprint,
  );
  assertUnique(assets, "media asset key", ({ assetKey }) => assetKey);
  assertUnique(
    assets,
    "media source fingerprint",
    ({ sourceFingerprint }) => sourceFingerprint,
  );

  const placementAssetKeys = new Set(
    placements.map(({ assetKey }) => assetKey),
  );
  const matchesByKey = new Map(matches.map((match) => [match.assetKey, match]));
  const assetsByKey = new Map(assets.map((asset) => [asset.assetKey, asset]));
  for (const match of matches) {
    if (!assetsByKey.has(match.assetKey)) {
      throw new Error(
        `Approved match ${match.assetKey} has no generated asset.`,
      );
    }
  }
  for (const asset of assets) {
    const match = matchesByKey.get(asset.assetKey);
    if (!match) throw new Error(`Asset ${asset.id} has no approved match.`);
    if (
      match.assetId !== asset.id ||
      match.sourceFingerprint !== asset.sourceFingerprint
    ) {
      throw new Error(`Approved mapping drift for ${asset.assetKey}.`);
    }
    if (!placementAssetKeys.has(asset.assetKey)) {
      throw new Error(`Asset ${asset.id} has no photo placement.`);
    }
    const configuredWidths = targetWidths.filter(
      (width) => width <= asset.width,
    );
    const applicableWidths =
      configuredWidths.length > 0 ? configuredWidths : [asset.width];
    const expectedVariants = new Set(
      applicableWidths.flatMap((width) => [`avif:${width}`, `webp:${width}`]),
    );
    const actualVariants = new Set<string>();
    for (const variant of asset.variants) {
      const key = `${variant.format}:${variant.width}`;
      if (actualVariants.has(key)) {
        throw new Error(`Duplicate ${key} variant for ${asset.id}.`);
      }
      actualVariants.add(key);
      const expectedPath = `pct-2026/${asset.assetKey}/${asset.sourceFingerprint}-${variant.width}.${variant.format}`;
      if (variant.path !== expectedPath) {
        throw new Error(
          `Immutable path drift for ${asset.id}: expected ${expectedPath}.`,
        );
      }
      await validateVariantFile(options.outputDirectory, variant);
    }
    for (const expected of expectedVariants) {
      if (!actualVariants.has(expected)) {
        throw new Error(`Missing ${expected} variant for ${asset.id}.`);
      }
    }
    for (const actual of actualVariants) {
      if (!expectedVariants.has(actual)) {
        throw new Error(`Unexpected ${actual} variant for ${asset.id}.`);
      }
    }
  }
  for (const placement of placements.filter(({ published }) => published)) {
    const asset = assetsByKey.get(placement.assetKey);
    if (!asset?.published) {
      throw new Error(
        `Published placement ${placement.id} has no published media asset.`,
      );
    }
  }

  const variants = assets.flatMap((asset) =>
    asset.variants.map((variant) => ({ assetId: asset.id, ...variant })),
  );
  const report: MediaReport = {
    version: 1,
    assetCount: assets.length,
    variantCount: variants.length,
    totalBytes: variants.reduce((total, { bytes }) => total + bytes, 0),
    bytesByFormat: {
      avif: variants
        .filter(({ format }) => format === "avif")
        .reduce((total, { bytes }) => total + bytes, 0),
      webp: variants
        .filter(({ format }) => format === "webp")
        .reduce((total, { bytes }) => total + bytes, 0),
    },
    largestVariants: [...variants]
      .sort(
        (left, right) =>
          right.bytes - left.bytes || left.path.localeCompare(right.path, "en"),
      )
      .slice(0, 10)
      .map(({ assetId, path, bytes }) => ({ assetId, path, bytes })),
  };
  if (options.reportPath) await writeJson(options.reportPath, report);
  return report;
}
