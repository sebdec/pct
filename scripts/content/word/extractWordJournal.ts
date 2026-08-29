import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  Correction,
  SourceDocument,
} from "../../../src/lib/content/schemas.ts";
import { assertContentModel } from "../../../src/lib/content/validateContent.ts";
import { parseDays } from "./parseDays.ts";
import { parseEditorial } from "./parseEditorial.ts";
import { parseMedia } from "./parseMedia.ts";
import { readOoxml } from "./readOoxml.ts";
import {
  writeGeneratedContent,
  type GeneratedContent,
  type WordExtractionReport,
} from "./writeGeneratedContent.ts";

const approvedFilename = "PCT 2026 - Sebdec.docx";
const approvedSha256 =
  "f57f19abb6360609f7f517ea53c1acbd824ef6a69faed3b599911800fd81eb4d";
const approvedStructure = {
  bodyBlocks: 993,
  paragraphs: 795,
  tables: 198,
  documentSections: 1,
  trailEntries: 97,
  postTrailEntries: 3,
  gearItems: 66,
  glossaryConcepts: 39,
  photoPlacements: 344,
  mediaAssets: 342,
} as const;

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

function parseInputArgument(arguments_: readonly string[]): string {
  const normalizedArguments = arguments_.filter(
    (argument) => argument !== "--",
  );
  const inputIndex = normalizedArguments.indexOf("--input");
  const input =
    inputIndex === -1 ? undefined : normalizedArguments[inputIndex + 1];
  if (!input || normalizedArguments.length !== 2) {
    throw new Error(
      "Usage: pnpm content:extract -- --input <path-to-approved-docx>",
    );
  }
  return resolve(input);
}

function assertCount(
  label: keyof typeof approvedStructure,
  actual: number,
): void {
  const expected = approvedStructure[label];
  if (actual !== expected) {
    throw new Error(
      `Unexpected ${label}: expected ${expected} and received ${actual}.`,
    );
  }
}

async function readCorrections(): Promise<Correction[]> {
  const path = resolve(repositoryRoot, "src/data/source/corrections.json");
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(value)) {
    throw new Error("src/data/source/corrections.json must contain an array.");
  }
  return value as Correction[];
}

function assertTrailContinuity(days: GeneratedContent["days"]): void {
  const trailDays = days.filter((day) => day.kind === "trail");
  trailDays.forEach((day, index) => {
    const previous = trailDays[index - 1];
    if (previous && day.mileStart !== previous.mileEnd) {
      throw new Error(
        `Trail mileage discontinuity between ${previous.id} and ${day.id}.`,
      );
    }
  });
  if (trailDays[0]?.mileStart !== 0 || trailDays.at(-1)?.mileEnd !== 2656) {
    throw new Error("Trail mileage must cover mile 0 through mile 2656.");
  }
}

async function extract(inputPath: string): Promise<void> {
  const document = await readOoxml(inputPath, approvedSha256);
  if (document.filename !== approvedFilename) {
    throw new Error(
      `Unexpected source filename. Expected "${approvedFilename}" and received "${document.filename}".`,
    );
  }
  assertCount("bodyBlocks", document.blocks.length);
  assertCount("paragraphs", document.paragraphCount);
  assertCount("tables", document.tableCount);
  assertCount("documentSections", document.documentSectionCount);
  assertCount("mediaAssets", document.media.size);

  const parsedDays = parseDays(document);
  const editorial = parseEditorial(document);
  const media = parseMedia(document, parsedDays.ranges);
  const trailEntries = parsedDays.days.filter(
    ({ kind }) => kind === "trail",
  ).length;
  const postTrailEntries = parsedDays.days.length - trailEntries;
  assertCount("trailEntries", trailEntries);
  assertCount("postTrailEntries", postTrailEntries);
  assertCount("gearItems", editorial.gearItems.length);
  assertCount("glossaryConcepts", editorial.glossaryConcepts.length);
  assertCount("photoPlacements", media.placementCount);
  assertCount("mediaAssets", media.mediaAssetCount);

  const journalEntries = parsedDays.journalEntries.map((entry) => ({
    ...entry,
    photoIds: media.photoIdsByDay.get(entry.dayId) ?? [],
  }));
  const sourceDocument: SourceDocument = {
    id: "pct-2026-word-source",
    filename: approvedFilename,
    sha256: document.sha256,
    sizeBytes: document.sizeBytes,
    counts: { ...approvedStructure },
  };
  const trailDayIds = new Set(
    parsedDays.days.filter(({ kind }) => kind === "trail").map(({ id }) => id),
  );
  const postTrailDayIds = new Set(
    parsedDays.days
      .filter(({ kind }) => kind === "post-trail")
      .map(({ id }) => id),
  );
  const trailPhotoPlacements = media.photos.filter(
    ({ dayId }) => dayId && trailDayIds.has(dayId),
  ).length;
  const postTrailPhotoPlacements = media.photos.filter(
    ({ dayId }) => dayId && postTrailDayIds.has(dayId),
  ).length;
  const pagePhotoPlacements = media.photos.filter(
    ({ pageId }) => pageId,
  ).length;
  const trailEntriesWithoutPhotos = journalEntries.filter(
    ({ dayId, photoIds }) => trailDayIds.has(dayId) && photoIds.length === 0,
  ).length;
  const report: WordExtractionReport = {
    sourceDocumentId: sourceDocument.id,
    generator: "scripts/content/word/extractWordJournal.ts",
    counts: {
      trailEntries,
      postTrailEntries,
      gearItems: editorial.gearItems.length,
      glossaryConcepts: editorial.glossaryConcepts.length,
      photoPlacements: media.placementCount,
      mediaAssets: media.mediaAssetCount,
      reusedMediaAssets: media.reusedMediaAssets,
      trailPhotoPlacements,
      postTrailPhotoPlacements,
      pagePhotoPlacements,
      trailEntriesWithoutPhotos,
    },
    validations: {
      sourceHashVerified: true,
      structuralCountsVerified: true,
      declaredMilesVerified: true,
      displayedKilometersVerified: true,
      trailMileageContinuous: true,
      mediaRelationshipsMatched: true,
      contentModelValidated: true,
    },
    structuralExceptions: [
      "5 trail entries intentionally contain no photo placement.",
      "2 embedded media assets are each placed in 2 source locations.",
      "The 25 July post-trail entry has no metadata table; its location label comes from the source heading.",
    ],
  };
  const generated: GeneratedContent = {
    sourceDocuments: [sourceDocument],
    regions: editorial.regions,
    sections: parsedDays.sections,
    days: parsedDays.days,
    journalEntries,
    journalBodies: parsedDays.journalBodies,
    photos: media.photos,
    glossaryConcepts: editorial.glossaryConcepts,
    localizedGlossaryEntries: editorial.localizedGlossaryEntries,
    gearItems: editorial.gearItems,
    localizedGearEntries: editorial.localizedGearEntries,
    supportingPages: editorial.supportingPages,
    supportingBodies: editorial.supportingBodies,
    report,
  };
  const corrections = await readCorrections();
  assertTrailContinuity(generated.days);
  assertContentModel({
    sourceDocuments: generated.sourceDocuments,
    extractionReports: [generated.report],
    regions: generated.regions,
    sections: generated.sections,
    days: generated.days,
    journalEntries: generated.journalEntries,
    photos: generated.photos,
    localizedPhotos: [],
    glossaryConcepts: generated.glossaryConcepts,
    localizedGlossaryEntries: generated.localizedGlossaryEntries,
    gearItems: generated.gearItems,
    localizedGearEntries: generated.localizedGearEntries,
    supportingPages: generated.supportingPages,
    corrections,
  });

  await writeGeneratedContent(repositoryRoot, generated);
  process.stdout.write(
    `Extracted ${parsedDays.days.length} entries, ${media.placementCount} photo placements, ${editorial.gearItems.length} gear items and ${editorial.glossaryConcepts.length} glossary concepts.\n`,
  );
}

try {
  await extract(parseInputArgument(process.argv.slice(2)));
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
