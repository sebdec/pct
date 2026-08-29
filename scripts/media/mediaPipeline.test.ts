import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";
import { zipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";

import { approveMatches } from "./approval.ts";
import { writeJson } from "./files.ts";
import { generateMediaAssets } from "./generation.ts";
import { describeImage } from "./image.ts";
import { classifyCandidates, scoreCandidate } from "./matching.ts";
import type { BlobClient } from "./uploading.ts";
import { uploadMediaAssets } from "./uploading.ts";
import { validateMediaPipeline } from "./validation.ts";
import type { MatchCandidate, MatchReport } from "./types.ts";
import { extractWordMedia } from "./wordSource.ts";

const temporaryDirectories: string[] = [];
const execFileAsync = promisify(execFile);
const encoder = new TextEncoder();
const syntheticPng = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

function candidate(
  sourceFingerprint: string,
  similarity: number,
): MatchCandidate {
  return {
    sourcePath: `/private/export/${sourceFingerprint}.jpg`,
    sourceFingerprint,
    similarity,
    visualSimilarity: similarity,
    aspectSimilarity: 1,
  };
}

async function createWorkspace(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "pct-media-test-"));
  temporaryDirectories.push(path);
  return path;
}

describe("media source matching", () => {
  it("loads the image module in the direct Node runtime used by media commands", async () => {
    await expect(
      execFileAsync(process.execPath, [
        "-e",
        "import('./scripts/media/image.ts')",
      ]),
    ).resolves.toMatchObject({ stderr: "" });
  });

  it("scores identical visual descriptors and classifies a clear winner", () => {
    const descriptor = {
      path: "source.jpg",
      fingerprint: "a".repeat(64),
      perceptualHash: "0f".repeat(32),
      width: 1600,
      height: 1200,
      capturedAt: "2026-04-18T10:00:00.000Z",
    };
    expect(scoreCandidate(descriptor, descriptor)).toEqual({
      similarity: 1,
      visualSimilarity: 1,
      aspectSimilarity: 1,
      captureTimeSimilarity: 1,
    });
    expect(
      classifyCandidates("word-media-aaaaaaaaaaaaaaaa", "a".repeat(64), [
        candidate("b".repeat(64), 0.97),
        candidate("c".repeat(64), 0.8),
      ]).status,
    ).toBe("automatic");
  });

  it("prioritizes an exact binary match over perceptually similar candidates", () => {
    const exact = {
      ...candidate("b".repeat(64), 1),
      exactBinaryMatch: true,
    };
    const entry = classifyCandidates(
      "word-media-aaaaaaaaaaaaaaaa",
      "a".repeat(64),
      [candidate("a".repeat(64), 1), exact],
    );

    expect(entry.status).toBe("automatic");
    expect(entry.candidates[0]).toEqual(exact);
  });

  it("keeps close candidates ambiguous and stores approvals without paths", () => {
    const report: MatchReport = {
      version: 1,
      counts: {
        wordAssets: 1,
        sourceImages: 2,
        automatic: 0,
        ambiguous: 1,
        unmatched: 0,
      },
      entries: [
        classifyCandidates("word-media-aaaaaaaaaaaaaaaa", "a".repeat(64), [
          candidate("b".repeat(64), 0.9),
          candidate("c".repeat(64), 0.89),
        ]),
      ],
    };
    const matches = approveMatches(report, {
      "word-media-aaaaaaaaaaaaaaaa": "c".repeat(64),
    });

    expect(matches).toEqual([
      {
        assetKey: "word-media-aaaaaaaaaaaaaaaa",
        assetId: "media-cccccccccccccccc",
        sourceFingerprint: "c".repeat(64),
        similarity: 0.89,
        approval: "manual",
      },
    ]);
    expect(JSON.stringify(matches)).not.toContain("/private/export");
  });
});

describe("Word media extraction", () => {
  it("extracts each distinct embedded binary with a stable content-addressed name", async () => {
    const workspace = await createWorkspace();
    const wordPath = join(workspace, "synthetic.docx");
    const outputDirectory = join(workspace, "word-sources");
    const relationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;
    const document = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`;
    const archive = zipSync({
      "word/document.xml": encoder.encode(document),
      "word/_rels/document.xml.rels": encoder.encode(relationships),
      "word/media/image1.png": syntheticPng,
    });
    await writeFile(wordPath, archive);
    const approvedSha256 = createHash("sha256").update(archive).digest("hex");
    const sourceFingerprint = createHash("sha256")
      .update(syntheticPng)
      .digest("hex");
    const expectedFilename = `word-media-${sourceFingerprint.slice(0, 16)}.png`;

    const first = await extractWordMedia({
      wordPath,
      outputDirectory,
      approvedFilename: "synthetic.docx",
      approvedSha256,
      expectedAssetCount: 1,
    });
    const firstIndex = await readFile(
      join(outputDirectory, "index.json"),
      "utf8",
    );
    const second = await extractWordMedia({
      wordPath,
      outputDirectory,
      approvedFilename: "synthetic.docx",
      approvedSha256,
      expectedAssetCount: 1,
    });

    expect(first).toEqual(second);
    expect(first).toEqual([
      {
        assetKey: `word-media-${sourceFingerprint.slice(0, 16)}`,
        sourceFingerprint,
        filename: expectedFilename,
        bytes: syntheticPng.byteLength,
      },
    ]);
    expect(await readFile(join(outputDirectory, expectedFilename))).toEqual(
      Buffer.from(syntheticPng),
    );
    expect(await readFile(join(outputDirectory, "index.json"), "utf8")).toBe(
      firstIndex,
    );
  });
});

describe("media generation, validation and upload", () => {
  it("generates deterministic metadata-free variants and uploads idempotently", async () => {
    const workspace = await createWorkspace();
    const sourcesDirectory = join(workspace, "sources");
    const sourcePath = join(sourcesDirectory, "synthetic.jpg");
    const outputDirectory = join(workspace, "derivatives");
    const matchesPath = join(workspace, "matches.json");
    const placementsPath = join(workspace, "photos.json");
    const manifestPath = join(workspace, "assets.json");
    const reportPath = join(workspace, "report.json");
    await mkdir(sourcesDirectory, { recursive: true });
    await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 31, g: 95, b: 67 },
      },
    })
      .jpeg({ quality: 92 })
      .toFile(sourcePath);
    const descriptor = await describeImage(sourcePath);
    const match = {
      assetKey: "word-media-aaaaaaaaaaaaaaaa",
      assetId: `media-${descriptor.fingerprint.slice(0, 16)}`,
      sourceFingerprint: descriptor.fingerprint,
      similarity: 1,
      approval: "automatic" as const,
    };
    await writeJson(matchesPath, [match]);
    await writeJson(placementsPath, [
      {
        id: "photo-001001",
        dayId: "day-001",
        order: 0,
        assetKey: match.assetKey,
        width: 640,
        height: 480,
        published: false,
        sourceRefs: [
          {
            document: "PCT 2026 - Sebdec.docx",
            blockType: "image",
            blockIndex: 1,
          },
        ],
      },
    ]);

    const first = await generateMediaAssets({
      matchesPath,
      sourcesDirectory,
      outputDirectory,
      manifestPath,
    });
    const firstManifest = await readFile(manifestPath, "utf8");
    const firstHashes = await Promise.all(
      first[0]!.variants.map(async ({ path }) =>
        createHash("sha256")
          .update(await readFile(join(outputDirectory, path)))
          .digest("hex"),
      ),
    );
    const second = await generateMediaAssets({
      matchesPath,
      sourcesDirectory,
      outputDirectory,
      manifestPath,
    });
    const secondHashes = await Promise.all(
      second[0]!.variants.map(async ({ path }) =>
        createHash("sha256")
          .update(await readFile(join(outputDirectory, path)))
          .digest("hex"),
      ),
    );
    expect(await readFile(manifestPath, "utf8")).toBe(firstManifest);
    expect(secondHashes).toEqual(firstHashes);
    expect(first[0]).toMatchObject({
      width: 800,
      height: 600,
      published: false,
    });
    expect(
      first[0]!.variants.map(({ width, format }) => `${format}:${width}`),
    ).toEqual(["avif:640", "webp:640"]);

    const report = await validateMediaPipeline({
      matchesPath,
      placementsPath,
      manifestPath,
      outputDirectory,
      reportPath,
    });
    expect(report).toMatchObject({ assetCount: 1, variantCount: 2 });

    const dryRun = await uploadMediaAssets({
      manifestPath,
      outputDirectory,
      execute: false,
      selectedAssetIds: [first[0]!.id],
    });
    expect(dryRun.plan).toHaveLength(2);
    expect(firstManifest).toBe(await readFile(manifestPath, "utf8"));
    await expect(
      uploadMediaAssets({
        manifestPath,
        outputDirectory,
        execute: true,
        confirmation: "pct-2026",
        token: "test-token",
        selectedAssetIds: [],
      }),
    ).rejects.toThrow("at least 1 explicitly selected asset");
    await expect(
      uploadMediaAssets({
        manifestPath,
        outputDirectory,
        execute: false,
        selectedAssetIds: ["media-does-not-exist"],
      }),
    ).rejects.toThrow("unknown asset media-does-not-exist");

    const put = vi.fn(async (path: string) => ({
      url: `https://blob.example/${path}`,
    }));
    const firstClient: BlobClient = {
      head: vi.fn(async () => null),
      put,
    };
    await uploadMediaAssets({
      manifestPath,
      outputDirectory,
      execute: true,
      confirmation: "pct-2026",
      token: "test-token",
      client: firstClient,
      selectedAssetIds: [first[0]!.id],
    });
    expect(put).toHaveBeenCalledTimes(2);

    const uploaded = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as typeof first;
    const existingSizes = new Map(
      uploaded[0]!.variants.map(({ path, bytes, url }) => [
        path,
        { size: bytes, url: url! },
      ]),
    );
    const secondPut = vi.fn(async () => {
      throw new Error("put should not be called");
    });
    await uploadMediaAssets({
      manifestPath,
      outputDirectory,
      execute: true,
      confirmation: "pct-2026",
      token: "test-token",
      selectedAssetIds: [first[0]!.id],
      client: {
        head: vi.fn(async (path) => existingSizes.get(path) ?? null),
        put: secondPut,
      },
    });
    expect(secondPut).not.toHaveBeenCalled();
  });

  it("normalizes EXIF orientation and never upscales a narrow source", async () => {
    const workspace = await createWorkspace();
    const sourcePath = join(workspace, "oriented.jpg");
    await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 3,
        background: { r: 178, g: 104, b: 47 },
      },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toFile(sourcePath);

    const descriptor = await describeImage(sourcePath);
    expect(descriptor).toMatchObject({ width: 80, height: 120 });
  });
});
