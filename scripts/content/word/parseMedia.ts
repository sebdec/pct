import { createHash } from "node:crypto";

import { imageSize } from "image-size";

import type { Photo } from "../../../src/lib/content/schemas.ts";
import type { DayBlockRange } from "./parseDays.ts";
import type { OoxmlBlock, OoxmlDocument, OoxmlParagraph } from "./readOoxml.ts";

export interface ParsedMedia {
  photos: Photo[];
  photoIdsByDay: ReadonlyMap<string, string[]>;
  placementCount: number;
  mediaAssetCount: number;
  reusedMediaAssets: number;
}

function findHeading(
  blocks: readonly OoxmlBlock[],
  text: string,
): OoxmlParagraph {
  const heading = blocks.find(
    (block): block is OoxmlParagraph =>
      block.kind === "paragraph" && block.text === text,
  );
  if (!heading) throw new Error(`Unable to find source heading "${text}".`);
  return heading;
}

function pageForIntroductoryImage(
  blockIndex: number,
  analysisStart: number,
  gearStart: number,
  journalStart: number,
): "introduction" | "analysis" {
  if (blockIndex < analysisStart) return "introduction";
  if (blockIndex < gearStart) return "analysis";
  if (blockIndex < journalStart) {
    throw new Error(
      `Unsupported pre-journal image at block ${blockIndex} outside introduction or analysis.`,
    );
  }
  throw new Error(
    `Image at block ${blockIndex} is not associated with an entry.`,
  );
}

export function parseMedia(
  document: OoxmlDocument,
  dayRanges: readonly DayBlockRange[],
): ParsedMedia {
  const analysisStart = findHeading(
    document.blocks,
    "🔢 Le PCT en quelques chiffres",
  ).blockIndex;
  const gearStart = findHeading(document.blocks, "🎒 Équipement").blockIndex;
  const journalStart = findHeading(document.blocks, "Journal").blockIndex;
  const photos: Photo[] = [];
  const photoIdsByDay = new Map<string, string[]>();
  const mediaOccurrences = new Map<string, number>();

  for (const block of document.blocks) {
    for (const image of block.images) {
      const media = document.media.get(image.mediaPath);
      if (!media) {
        throw new Error(
          `Relationship ${image.relationshipId} points to missing ${image.mediaPath}.`,
        );
      }
      const dimensions = imageSize(media);
      if (!dimensions.width || !dimensions.height) {
        throw new Error(`Unable to read dimensions for ${image.mediaPath}.`);
      }

      const placementNumber = photos.length + 1;
      const id = `photo-${String(placementNumber).padStart(4, "0")}`;
      const sourceHash = createHash("sha256").update(media).digest("hex");
      const occurrence = (mediaOccurrences.get(image.mediaPath) ?? 0) + 1;
      mediaOccurrences.set(image.mediaPath, occurrence);
      const dayRange = dayRanges.find(
        ({ startBlock, endBlockExclusive }) =>
          block.blockIndex >= startBlock &&
          block.blockIndex < endBlockExclusive,
      );
      const association = dayRange
        ? { dayId: dayRange.dayId }
        : {
            pageId: pageForIntroductoryImage(
              block.blockIndex,
              analysisStart,
              gearStart,
              journalStart,
            ),
          };

      photos.push({
        id,
        ...association,
        order: placementNumber - 1,
        assetKey: `word-media-${sourceHash.slice(0, 16)}`,
        width: dimensions.width,
        height: dimensions.height,
        published: false,
        sourceRefs: [
          {
            document: document.filename,
            blockType: "image",
            blockIndex: block.blockIndex,
            detail: [
              `relationshipId=${image.relationshipId}`,
              `media=${image.mediaPath}`,
              `occurrence=${occurrence}`,
              `sha256=${sourceHash}`,
              `width=${dimensions.width}`,
              `height=${dimensions.height}`,
            ].join("; "),
          },
        ],
      });

      if (dayRange) {
        const ids = photoIdsByDay.get(dayRange.dayId) ?? [];
        ids.push(id);
        photoIdsByDay.set(dayRange.dayId, ids);
      }
    }
  }

  const reusedMediaAssets = [...mediaOccurrences.values()].filter(
    (count) => count > 1,
  ).length;

  return {
    photos,
    photoIdsByDay,
    placementCount: photos.length,
    mediaAssetCount: mediaOccurrences.size,
    reusedMediaAssets,
  };
}
