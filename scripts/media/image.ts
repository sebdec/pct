import { readFile } from "node:fs/promises";

import exifr from "exifr";
import sharp from "sharp";

import { fingerprint } from "./files.ts";
import type { ImageDescriptor } from "./types.ts";

const hashSize = 16;

function orientedDimensions(
  width: number,
  height: number,
  orientation?: number,
): { width: number; height: number } {
  return orientation && orientation >= 5
    ? { width: height, height: width }
    : { width, height };
}

function averageHash(pixels: Uint8Array): string {
  const mean =
    pixels.reduce((total, value) => total + value, 0) / pixels.length;
  let output = "";

  for (let offset = 0; offset < pixels.length; offset += 4) {
    let nibble = 0;
    for (let bit = 0; bit < 4; bit += 1) {
      if ((pixels[offset + bit] ?? 0) >= mean) nibble |= 1 << (3 - bit);
    }
    output += nibble.toString(16);
  }

  return output;
}

function isoCaptureDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
  }
  return undefined;
}

export async function describeImage(
  path: string,
  bytes?: Uint8Array,
): Promise<ImageDescriptor> {
  const input = bytes ?? (await readFile(path));

  try {
    const metadata = await sharp(input).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("image dimensions are missing");
    }
    const dimensions = orientedDimensions(
      metadata.width,
      metadata.height,
      metadata.orientation,
    );
    const hashPixels = await sharp(input)
      .rotate()
      .resize(hashSize, hashSize, { fit: "fill" })
      .greyscale()
      .raw()
      .toBuffer();
    const exif = (await exifr
      .parse(input, ["DateTimeOriginal", "CreateDate"])
      .catch(() => undefined)) as Record<string, unknown> | undefined;

    return {
      path,
      fingerprint: fingerprint(input),
      perceptualHash: averageHash(hashPixels),
      ...dimensions,
      capturedAt: isoCaptureDate(exif?.DateTimeOriginal ?? exif?.CreateDate),
    };
  } catch (error) {
    throw new Error(
      `Unable to read image "${path}": ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error,
      },
    );
  }
}

export function hammingSimilarity(left: string, right: string): number {
  if (left.length !== right.length || !left.length) {
    throw new Error("Perceptual hashes must have the same non-zero length.");
  }
  let differentBits = 0;
  for (let index = 0; index < left.length; index += 1) {
    const difference =
      Number.parseInt(left[index] ?? "0", 16) ^
      Number.parseInt(right[index] ?? "0", 16);
    differentBits += difference.toString(2).replaceAll("0", "").length;
  }
  return 1 - differentBits / (left.length * 4);
}
