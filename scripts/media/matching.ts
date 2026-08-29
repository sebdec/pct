import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { readOoxml } from "../content/word/readOoxml.ts";
import { describeImage, hammingSimilarity } from "./image.ts";
import { listImageFiles, readJson, repositoryRoot } from "./files.ts";
import type {
  ImageDescriptor,
  MatchCandidate,
  MatchReport,
  MatchReportEntry,
  WordAssetDescriptor,
} from "./types.ts";

const automaticThreshold = 0.92;
const ambiguityThreshold = 0.78;
const minimumAutomaticGap = 0.025;

interface SourceManifest {
  sha256: string;
}

function assertSourceManifest(value: unknown): SourceManifest {
  if (
    !Array.isArray(value) ||
    value.length !== 1 ||
    typeof value[0] !== "object" ||
    value[0] === null ||
    !("sha256" in value[0]) ||
    typeof value[0].sha256 !== "string"
  ) {
    throw new Error("src/data/source/word-source.json is invalid.");
  }
  return { sha256: value[0].sha256 };
}

function aspectSimilarity(
  left: ImageDescriptor,
  right: ImageDescriptor,
): number {
  const leftRatio = left.width / left.height;
  const rightRatio = right.width / right.height;
  return Math.exp(-Math.abs(Math.log(leftRatio / rightRatio)) * 4);
}

function captureTimeSimilarity(
  left?: string,
  right?: string,
): number | undefined {
  if (!left || !right) return undefined;
  const distance = Math.abs(
    new Date(left).valueOf() - new Date(right).valueOf(),
  );
  if (distance <= 2 * 60 * 1000) return 1;
  if (distance <= 24 * 60 * 60 * 1000) return 0.5;
  return 0;
}

export function scoreCandidate(
  wordAsset: ImageDescriptor,
  source: ImageDescriptor,
): Omit<MatchCandidate, "sourcePath" | "sourceFingerprint"> {
  const visualSimilarity = hammingSimilarity(
    wordAsset.perceptualHash,
    source.perceptualHash,
  );
  const aspect = aspectSimilarity(wordAsset, source);
  const capture = captureTimeSimilarity(
    wordAsset.capturedAt,
    source.capturedAt,
  );
  const similarity =
    capture === undefined
      ? visualSimilarity * 0.8 + aspect * 0.2
      : visualSimilarity * 0.75 + aspect * 0.2 + capture * 0.05;

  return {
    similarity: Number(similarity.toFixed(6)),
    visualSimilarity: Number(visualSimilarity.toFixed(6)),
    aspectSimilarity: Number(aspect.toFixed(6)),
    ...(capture === undefined
      ? {}
      : { captureTimeSimilarity: Number(capture.toFixed(6)) }),
  };
}

export function classifyCandidates(
  assetKey: string,
  wordFingerprint: string,
  candidates: MatchCandidate[],
): MatchReportEntry {
  const ranked = [...candidates]
    .sort(
      (left, right) =>
        Number(Boolean(right.exactBinaryMatch)) -
          Number(Boolean(left.exactBinaryMatch)) ||
        right.similarity - left.similarity ||
        left.sourceFingerprint.localeCompare(right.sourceFingerprint, "en"),
    )
    .slice(0, 5);
  const best = ranked[0];
  const runnerUp = ranked[1];
  const gap = best ? best.similarity - (runnerUp?.similarity ?? 0) : 0;
  const status =
    best?.exactBinaryMatch ||
    (best &&
      best.similarity >= automaticThreshold &&
      gap >= minimumAutomaticGap)
      ? "automatic"
      : best && best.similarity >= ambiguityThreshold
        ? "ambiguous"
        : "unmatched";

  return { assetKey, wordFingerprint, status, candidates: ranked };
}

async function describeWordAssets(
  wordPath: string,
): Promise<WordAssetDescriptor[]> {
  const sourceManifest = assertSourceManifest(
    await readJson(`${repositoryRoot}/src/data/source/word-source.json`),
  );
  const document = await readOoxml(wordPath, sourceManifest.sha256);
  const assets: WordAssetDescriptor[] = [];

  for (const [mediaPath, bytes] of document.media) {
    const wordFingerprint = createHash("sha256").update(bytes).digest("hex");
    assets.push({
      ...(await describeImage(mediaPath, bytes)),
      assetKey: `word-media-${wordFingerprint.slice(0, 16)}`,
    });
  }

  return assets.sort((left, right) =>
    left.assetKey.localeCompare(right.assetKey, "en"),
  );
}

async function describeSources(directory: string): Promise<ImageDescriptor[]> {
  const paths = await listImageFiles(directory);
  const sources: ImageDescriptor[] = [];

  for (const path of paths) sources.push(await describeImage(path));
  const fingerprints = new Set<string>();
  for (const source of sources) {
    if (fingerprints.has(source.fingerprint)) {
      throw new Error(
        `Duplicate original content detected for fingerprint ${source.fingerprint}.`,
      );
    }
    fingerprints.add(source.fingerprint);
  }
  return sources;
}

export async function createMatchReport(
  wordPath: string,
  sourcesDirectory: string,
): Promise<MatchReport> {
  await readFile(wordPath);
  const [wordAssets, sources] = await Promise.all([
    describeWordAssets(wordPath),
    describeSources(sourcesDirectory),
  ]);
  const entries = wordAssets.map((wordAsset) => {
    const candidates = sources.map((source) => ({
      sourcePath: source.path,
      sourceFingerprint: source.fingerprint,
      ...(source.fingerprint === wordAsset.fingerprint
        ? {
            exactBinaryMatch: true,
            similarity: 1,
            visualSimilarity: 1,
            aspectSimilarity: 1,
          }
        : scoreCandidate(wordAsset, source)),
    }));
    return classifyCandidates(
      wordAsset.assetKey,
      wordAsset.fingerprint,
      candidates,
    );
  });

  return {
    version: 1,
    counts: {
      wordAssets: wordAssets.length,
      sourceImages: sources.length,
      automatic: entries.filter(({ status }) => status === "automatic").length,
      ambiguous: entries.filter(({ status }) => status === "ambiguous").length,
      unmatched: entries.filter(({ status }) => status === "unmatched").length,
    },
    entries,
  };
}
