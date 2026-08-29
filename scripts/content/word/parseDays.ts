import type {
  Day,
  JournalEntry,
  Region,
  SourceReference,
  TrailSection,
} from "../../../src/lib/content/schemas.ts";
import {
  isPostTrailMetadataTable,
  isTrailMetadataTable,
  parsePostTrailMetadata,
  parseTrailMetadata,
} from "./parseTables.ts";
import type {
  OoxmlBlock,
  OoxmlDocument,
  OoxmlParagraph,
  OoxmlTable,
} from "./readOoxml.ts";

export interface DayBlockRange {
  dayId: string;
  startBlock: number;
  endBlockExclusive: number;
}

export interface ParsedDays {
  days: Day[];
  journalEntries: JournalEntry[];
  journalBodies: ReadonlyMap<string, string>;
  sections: TrailSection[];
  ranges: DayBlockRange[];
}

interface ParsedFrenchDate {
  date: string;
  endDate?: string;
}

const monthNumbers: Readonly<Record<string, number>> = {
  janvier: 1,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
};

export function slugify(value: string): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error(`Unable to create an ID from "${value}".`);
  return slug;
}

function isoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseFrenchDateHeading(heading: string): ParsedFrenchDate {
  const text = heading.replace(/^🗓️\s*/u, "").replace(/^Jour\s+1\s+-\s+/iu, "");
  const range = text.match(
    /\p{L}+\s+(\d{1,2})\s+au\s+\p{L}+\s+(\d{1,2})\s+(\p{L}+)\s+(\d{4})/iu,
  );
  if (range) {
    const month = monthNumbers[range[3].toLowerCase()];
    if (!month) throw new Error(`Unknown French month in "${heading}".`);
    return {
      date: isoDate(Number(range[4]), month, Number(range[1])),
      endDate: isoDate(Number(range[4]), month, Number(range[2])),
    };
  }

  const single = text.match(/\p{L}+\s+(\d{1,2})\s+(\p{L}+)\s+(\d{4})/iu);
  if (!single) throw new Error(`Unexpected journal heading "${heading}".`);
  const month = monthNumbers[single[2].toLowerCase()];
  if (!month) throw new Error(`Unknown French month in "${heading}".`);
  return { date: isoDate(Number(single[3]), month, Number(single[1])) };
}

function headingLevel(paragraph: OoxmlParagraph): number | undefined {
  const match = paragraph.style.match(/^Heading\s*([1-3])$/iu);
  return match ? Number(match[1]) : undefined;
}

function sourceReference(
  filename: string,
  block: OoxmlBlock,
  detail?: string,
): SourceReference {
  return {
    document: filename,
    blockType: block.kind === "table" ? "table" : "heading",
    blockIndex: block.blockIndex,
    ...(detail ? { detail } : {}),
  };
}

function paragraphReference(
  filename: string,
  paragraph: OoxmlParagraph,
): SourceReference {
  return {
    document: filename,
    blockType: "paragraph",
    blockIndex: paragraph.blockIndex,
  };
}

export function regionIdFromLabel(label: string): Region["id"] {
  const normalized = slugify(label);
  if (
    normalized.includes("southern-california") ||
    normalized.includes("desert")
  ) {
    return "desert";
  }
  if (normalized.includes("sierra")) return "sierra";
  if (normalized.includes("northern-california")) return "norcal";
  if (normalized.includes("oregon")) return "oregon";
  if (normalized.includes("washington")) return "washington";
  throw new Error(`Unknown PCT region "${label}".`);
}

function sectionState(
  regionId: Region["id"],
  code: string,
): "california" | "oregon" | "washington" {
  if (["desert", "sierra", "norcal"].includes(regionId)) return "california";
  if (regionId === "washington") return "washington";
  return code >= "H" ? "washington" : "oregon";
}

function postTrailLocation(heading: string): string {
  const suffix = heading.split(":").slice(1).join(":").trim();
  return suffix.replace(/^de\s+/iu, "") || "Après le terminus";
}

function findEntryHeadings(blocks: readonly OoxmlBlock[]): OoxmlParagraph[] {
  return blocks.filter(
    (block): block is OoxmlParagraph =>
      block.kind === "paragraph" &&
      headingLevel(block) === 3 &&
      block.text.startsWith("🗓️"),
  );
}

function blockRange(
  blocks: readonly OoxmlBlock[],
  startBlock: number,
  endBlockExclusive: number,
): OoxmlBlock[] {
  return blocks.filter(
    ({ blockIndex }) =>
      blockIndex >= startBlock && blockIndex < endBlockExclusive,
  );
}

export function parseDays(document: OoxmlDocument): ParsedDays {
  const headings = findEntryHeadings(document.blocks);
  const afterTerminusHeading = document.blocks.find(
    (block): block is OoxmlParagraph =>
      block.kind === "paragraph" &&
      headingLevel(block) === 1 &&
      block.text === "Après le terminus",
  );
  if (!afterTerminusHeading) {
    throw new Error('The source has no Heading 1 named "Après le terminus".');
  }

  const days: Day[] = [];
  const journalEntries: JournalEntry[] = [];
  const journalBodies = new Map<string, string>();
  const sectionById = new Map<string, TrailSection>();
  const ranges: DayBlockRange[] = [];

  headings.forEach((heading, index) => {
    const sequence = index + 1;
    const dayId = `day-${String(sequence).padStart(3, "0")}`;
    const nextBoundary = document.blocks.find(
      (block): block is OoxmlParagraph =>
        block.kind === "paragraph" &&
        block.blockIndex > heading.blockIndex &&
        headingLevel(block) !== undefined,
    );
    const endBlockExclusive =
      nextBoundary?.blockIndex ?? document.blocks.length;
    const blocks = blockRange(
      document.blocks,
      heading.blockIndex,
      endBlockExclusive,
    );
    const tables = blocks.filter(
      (block): block is OoxmlTable => block.kind === "table",
    );
    const prose = blocks.filter(
      (block): block is OoxmlParagraph =>
        block.kind === "paragraph" &&
        block.blockIndex !== heading.blockIndex &&
        headingLevel(block) === undefined &&
        Boolean(block.markdown),
    );
    const parsedDate = parseFrenchDateHeading(heading.text);
    const title = heading.text.replace(/^🗓️\s*/u, "");
    const headingRef = sourceReference(document.filename, heading);
    const isPostTrail = heading.blockIndex > afterTerminusHeading.blockIndex;
    let locationLabel: string;

    if (isPostTrail) {
      const metadataTables = tables.filter(isPostTrailMetadataTable);
      if (metadataTables.length > 1) {
        throw new Error(
          `Post-trail entry ${dayId} has multiple metadata tables.`,
        );
      }
      locationLabel = metadataTables[0]
        ? parsePostTrailMetadata(metadataTables[0]).locationLabel
        : postTrailLocation(heading.text);
      days.push({
        id: dayId,
        sequence,
        kind: "post-trail",
        date: parsedDate.date,
        ...(parsedDate.endDate ? { endDate: parsedDate.endDate } : {}),
        published: true,
        sourceRefs: [
          headingRef,
          ...metadataTables.map((table) =>
            sourceReference(document.filename, table, "post-trail metadata"),
          ),
        ],
      });
    } else {
      const metadataTables = tables.filter(isTrailMetadataTable);
      if (metadataTables.length !== 1) {
        throw new Error(
          `Trail entry ${dayId} requires exactly 1 metadata table and has ${metadataTables.length}.`,
        );
      }
      const metadataTable = metadataTables[0];
      const metadata = parseTrailMetadata(metadataTable);
      const regionId = regionIdFromLabel(metadata.regionLabel);
      const sectionIds = metadata.sections.map(({ code, properName }) => {
        const state = sectionState(regionId, code);
        const id = `section-${state}-${code.toLowerCase()}`;
        const sectionRegionId =
          state === "washington"
            ? "washington"
            : state === "oregon"
              ? "oregon"
              : regionId;
        const existing = sectionById.get(id);
        if (existing && existing.properName !== properName) {
          throw new Error(
            `Section ${id} has conflicting names "${existing.properName}" and "${properName}".`,
          );
        }
        if (!existing) {
          sectionById.set(id, {
            id,
            code,
            regionId: sectionRegionId,
            properName,
            published: true,
            sourceRefs: [
              sourceReference(
                document.filename,
                metadataTable,
                `row=1; label=Section; code=${code}; properName=${properName}`,
              ),
            ],
          });
        }
        return id;
      });

      locationLabel = metadata.locationLabel;
      days.push({
        id: dayId,
        sequence,
        kind: "trail",
        date: parsedDate.date,
        regionId,
        sectionIds,
        mileStart: metadata.mileStart,
        mileEnd: metadata.mileEnd,
        ascentMeters: metadata.ascentMeters,
        descentMeters: metadata.descentMeters,
        locationId: slugify(locationLabel),
        published: true,
        sourceRefs: [
          headingRef,
          sourceReference(document.filename, metadataTable, "daily metadata"),
        ],
      });
    }

    journalEntries.push({
      dayId,
      locale: "fr",
      title,
      locationLabel,
      photoIds: [],
      sourceRefs: [
        headingRef,
        ...prose.map((item) => paragraphReference(document.filename, item)),
      ],
    });
    journalBodies.set(
      dayId,
      prose.map(({ markdown }) => markdown).join("\n\n"),
    );
    ranges.push({
      dayId,
      startBlock: heading.blockIndex,
      endBlockExclusive,
    });
  });

  return {
    days,
    journalEntries,
    journalBodies,
    sections: [...sectionById.values()],
    ranges,
  };
}
