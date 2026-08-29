import type {
  ApprovedMediaMatch,
  MediaAsset,
  MediaVariant,
  Photo,
} from "../../src/lib/content/schemas.ts";

export const targetWidths = [640, 960, 1440, 1920] as const;
export const supportedImageExtensions = new Set([
  ".avif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

export interface ImageDescriptor {
  path: string;
  fingerprint: string;
  perceptualHash: string;
  width: number;
  height: number;
  capturedAt?: string;
}

export interface WordAssetDescriptor extends ImageDescriptor {
  assetKey: string;
}

export interface MatchCandidate {
  sourcePath: string;
  sourceFingerprint: string;
  exactBinaryMatch?: boolean;
  similarity: number;
  visualSimilarity: number;
  aspectSimilarity: number;
  captureTimeSimilarity?: number;
}

export interface MatchReportEntry {
  assetKey: string;
  wordFingerprint: string;
  status: "automatic" | "ambiguous" | "unmatched";
  candidates: MatchCandidate[];
}

export interface MatchReport {
  version: 1;
  counts: {
    wordAssets: number;
    sourceImages: number;
    automatic: number;
    ambiguous: number;
    unmatched: number;
  };
  entries: MatchReportEntry[];
}

export interface MediaReport {
  version: 1;
  assetCount: number;
  variantCount: number;
  totalBytes: number;
  bytesByFormat: Record<MediaVariant["format"], number>;
  largestVariants: Array<{
    assetId: string;
    path: string;
    bytes: number;
  }>;
}

export interface PipelinePaths {
  repositoryRoot: string;
  outputDirectory: string;
  manifestPath: string;
  matchesPath: string;
  placementsPath: string;
  reportPath: string;
}

export type { ApprovedMediaMatch, MediaAsset, MediaVariant, Photo };
