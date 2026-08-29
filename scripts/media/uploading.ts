import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  BlobNotFoundError,
  head as vercelHead,
  put as vercelPut,
} from "@vercel/blob";

import {
  mediaAssetSchema,
  type MediaAsset,
} from "../../src/lib/content/schemas.ts";
import { readJson, writeJson } from "./files.ts";

export interface BlobClient {
  head(
    path: string,
    token: string,
  ): Promise<{ size: number; url: string } | null>;
  put(
    path: string,
    body: Uint8Array,
    options: { contentType: string; token: string },
  ): Promise<{ url: string }>;
}

export interface UploadPlanItem {
  assetId: string;
  path: string;
  bytes: number;
  action: "check-or-upload";
}

export function createUploadPlan(
  assets: readonly MediaAsset[],
): UploadPlanItem[] {
  return assets
    .flatMap((asset) =>
      asset.variants.map((variant) => ({
        assetId: asset.id,
        path: variant.path,
        bytes: variant.bytes,
        action: "check-or-upload" as const,
      })),
    )
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
}

const defaultBlobClient: BlobClient = {
  async head(path, token) {
    try {
      const result = await vercelHead(path, { token });
      return { size: result.size, url: result.url };
    } catch (error) {
      if (error instanceof BlobNotFoundError) return null;
      throw error;
    }
  },
  async put(path, body, { contentType, token }) {
    return vercelPut(path, Buffer.from(body), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 31_536_000,
      contentType,
      token,
    });
  },
};

function parseManifest(value: unknown): MediaAsset[] {
  if (!Array.isArray(value))
    throw new Error("Media manifest must contain an array.");
  return value.map((entry) => mediaAssetSchema.parse(entry));
}

export async function uploadMediaAssets(options: {
  manifestPath: string;
  outputDirectory: string;
  execute: boolean;
  confirmation?: string;
  token?: string;
  client?: BlobClient;
}): Promise<{ plan: UploadPlanItem[]; assets: MediaAsset[] }> {
  const assets = parseManifest(await readJson(options.manifestPath));
  const plan = createUploadPlan(assets);
  if (!options.execute) return { plan, assets };
  if (options.confirmation !== "pct-2026") {
    throw new Error('Real upload requires --confirm-upload "pct-2026".');
  }
  if (!options.token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required for real upload.");
  }
  const client = options.client ?? defaultBlobClient;

  for (const asset of assets) {
    for (const variant of asset.variants) {
      const existing = await client.head(variant.path, options.token);
      if (existing) {
        if (existing.size !== variant.bytes) {
          throw new Error(
            `Remote conflict for ${variant.path}: expected ${variant.bytes} bytes and found ${existing.size}.`,
          );
        }
        variant.url = existing.url;
        continue;
      }
      const body = await readFile(
        resolve(options.outputDirectory, variant.path),
      );
      if (body.byteLength !== variant.bytes) {
        throw new Error(`Local byte size drift for ${variant.path}.`);
      }
      const uploaded = await client.put(variant.path, body, {
        contentType: `image/${variant.format}`,
        token: options.token,
      });
      variant.url = uploaded.url;
    }
  }

  await writeJson(options.manifestPath, assets);
  return { plan, assets };
}
